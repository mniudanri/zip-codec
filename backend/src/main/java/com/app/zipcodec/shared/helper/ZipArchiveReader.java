package com.app.zipcodec.shared.helper;

import com.app.zipcodec.model.ArchiveBudget;
import com.app.zipcodec.model.ArchiveLimits;
import com.app.zipcodec.model.ArchiveNode;
import com.app.zipcodec.shared.enums.ArchiveViolation;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import com.app.zipcodec.shared.exceptions.PolicyViolationException;
import com.app.zipcodec.shared.helper.ArchiveTreeBuilder.NestedScope;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveInputStream;
import org.apache.commons.compress.archivers.zip.ZipFile;
import org.apache.commons.io.input.CloseShieldInputStream;
import org.apache.tika.Tika;
import org.springframework.stereotype.Component;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.Charset;
import java.nio.file.Path;
import java.util.Enumeration;
import java.util.HexFormat;
import java.util.Locale;
import java.util.zip.CRC32;


/**
 * Reads ZIP archives and convert to requested objects
 *
 */
@Component
public class ZipArchiveReader {
    private static final String FALLBACK_MEDIA_TYPE = "application/octet-stream";
    private final Base64Codec base64Codec;
    private final Tika tika = new Tika();
    private final ArchivePolicyValidator policyValidator;

    public ZipArchiveReader(Base64Codec base64Codec, ArchivePolicyValidator policyValidator) {
        this.base64Codec = base64Codec;
        this.policyValidator = policyValidator;
    }
    /**
     * @param includeContent        when false only metadata is collected (inspect mode)
     * @param recurseNestedArchives expand nested .zip entries instead of encoding them
     * @param fallbackCharset       used for entry names without the UTF-8 flag
     * @param variant               Base64 alphabet applied to per-entry payloads
     */

    public record Options(ArchiveLimits limits,
                          boolean includeContent,
                          boolean recurseNestedArchives,
                          Charset fallbackCharset,
                          EncodingVariant variant) {
    }

    /** Result of reading an archive into the tree. */
    public record Content(ArchiveNode.Directory root, int entryCount, int maxDepth, String entryNameCharset) {
    }

    public Content read(Path archiveFile, Options options) {
        ArchiveBudget budget = new ArchiveBudget(options.limits());
        ArchiveTreeBuilder tree = new ArchiveTreeBuilder();
        try (ZipFile zip = ZipFile.builder()
                .setPath(archiveFile)
                .setCharset(options.fallbackCharset())
                .get()) {
            Enumeration<ZipArchiveEntry> entries = zip.getEntries();
            while (entries.hasMoreElements()) {
                readTopLevelEntry(zip, entries.nextElement(), tree, budget, options);
            }
        } catch (IOException e) {
            throw new InvalidArchiveException("Payload is not a readable ZIP archive", e);
        }
        return new Content(tree.build(), budget.entryCount(), tree.maxDepth(),
                options.fallbackCharset().name());
    }

    private void readTopLevelEntry(ZipFile zip,
                                   ZipArchiveEntry entry,
                                   ArchiveTreeBuilder tree,
                                   ArchiveBudget budget,
                                   Options options) throws IOException {
        String path = policyValidator.sanitizePath(entry.getName(), options.limits().maxPathLength());
        budget.registerEntry();
        if (entry.isDirectory()) {
            tree.addDirectory(path);
            return;
        }
        rejectUnsupported(entry);
        if (!options.includeContent()) {
            tree.addFile(path, metadataOnlyNode(entry, path, budget));
            return;
        }
        if (isNestedArchive(path) && options.recurseNestedArchives()) {
            budget.requireDepthAllowed(1);
            NestedScope scope = tree.nestedArchiveAt(path);
            try (InputStream nested = zip.getInputStream(entry)) {
                readNestedArchive(nested, scope, budget, options, 1);
            }
            return;
        }
        EntryPayload payload;
        try (InputStream content = zip.getInputStream(entry)) {
            payload = readFully(content, path, budget, options);
        }
        budget.verifyCompressionRatio(path, entry.getCompressedSize(), payload.size());
        tree.addFile(path, toFileNode(entry.getName(), path, payload, options.variant()));
    }
    /**
     * Expands a nested archive. {@link ZipArchiveInputStream} is used because the
     * nested stream is not seekable; declared sizes may therefore be unknown, which
     * is why the budget is charged with bytes actually read.
     */
    private void readNestedArchive(InputStream source,
                                   NestedScope scope,
                                   ArchiveBudget budget,
                                   Options options,
                                   int depth) throws IOException {
        try (ZipArchiveInputStream zip = new ZipArchiveInputStream(source, options.fallbackCharset().name())) {
            ZipArchiveEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (!zip.canReadEntryData(entry)) {
                    throw new PolicyViolationException(ArchiveViolation.UNSUPPORTED_ENTRY_TYPE,
                            "Unsupported compression method in nested entry: " + entry.getName());
                }
                String relativePath =
                        policyValidator.sanitizePath(entry.getName(), options.limits().maxPathLength());
                budget.registerEntry();
                if (entry.isDirectory()) {
                    scope.addDirectory(relativePath);
                    continue;
                }
                rejectUnsupported(entry);
                String absolutePath = scope.absolutePath(relativePath);
                if (isNestedArchive(relativePath) && depth < options.limits().maxNestingDepth()) {
                    budget.requireDepthAllowed(depth + 1);
                    // The shield is essential: the recursive call owns its own
                    // ZipArchiveInputStream and closes it, which would otherwise
                    // close this stream too and abort the enclosing iteration.
                    readNestedArchive(CloseShieldInputStream.wrap(zip), scope.nestedArchiveAt(relativePath), budget, options, depth + 1);
                    continue;
                }
                EntryPayload payload = readFully(zip, absolutePath, budget, options);
                budget.verifyCompressionRatio(absolutePath, entry.getCompressedSize(), payload.size());
                scope.addFile(relativePath,
                        toFileNode(entry.getName(), absolutePath, payload, options.variant()));
            }
        }
    }
    /**
     * Reads one entry, charging every chunk against the budget so a zip bomb is
     * stopped mid-stream rather than after it has been fully expanded.
     */
    private EntryPayload readFully(InputStream source,
                                   String path,
                                   ArchiveBudget budget,
                                   Options options) throws IOException {
        ByteArrayOutputStream sink = new ByteArrayOutputStream();
        CRC32 crc = new CRC32();
        byte[] buffer = new byte[64 * 1024];
        long entryBytes = 0;
        int read;
        while ((read = source.read(buffer)) != -1) {
            entryBytes += read;
            budget.charge(path, read, entryBytes);
            crc.update(buffer, 0, read);
            sink.write(buffer, 0, read);
        }
        if (entryBytes > options.limits().maxEntryBytes()) {
            throw new PolicyViolationException(ArchiveViolation.ENTRY_SIZE_EXCEEDED,
                    "Entry '%s' is larger than the per-entry limit".formatted(path));
        }
        return new EntryPayload(sink.toByteArray(), crc.getValue());
    }
    private ArchiveNode.File metadataOnlyNode(ZipArchiveEntry entry, String path, ArchiveBudget budget) {
        long declaredSize = Math.max(entry.getSize(), 0);
        budget.charge(path, declaredSize, declaredSize);
        budget.verifyCompressionRatio(path, entry.getCompressedSize(), entry.getSize());
        return new ArchiveNode.File(leafName(entry.getName()), path, declaredSize,
                detectByName(entry.getName()), hex(entry.getCrc()), null);
    }
    private ArchiveNode.File toFileNode(String rawName, String path, EntryPayload payload, EncodingVariant variant) {
        String mimeType = detect(payload.data(), rawName);
        String base64 = base64Codec.encodeToString(payload.data(), variant);
        return new ArchiveNode.File(leafName(rawName), path, payload.size(), mimeType,
                hex(payload.crc32()), base64);
    }

    /**
     * Sniffs vulnerable bytes inside ZIP
     */
    private String detect(byte[] content, String entryName) {
        try (ByteArrayInputStream in = new ByteArrayInputStream(content)) {
            return tika.detect(in, entryName);
        } catch (IOException e) {
            return detectByName(entryName);
        }
    }

    private String detectByName(String entryName) {
        try {
            return tika.detect(entryName);
        } catch (RuntimeException e) {
            return FALLBACK_MEDIA_TYPE;
        }
    }

    private void rejectUnsupported(ZipArchiveEntry entry) {
        if (entry.getGeneralPurposeBit().usesEncryption()) {
            throw new PolicyViolationException(ArchiveViolation.ENCRYPTED_ENTRY,
                    "Encrypted entries are not supported: " + entry.getName());
        }
        if (entry.isUnixSymlink()) {
            throw new PolicyViolationException(ArchiveViolation.UNSUPPORTED_ENTRY_TYPE,
                    "Symbolic links are not supported: " + entry.getName());
        }
    }

    private static boolean isNestedArchive(String path) {
        return path.toLowerCase(Locale.ROOT).endsWith(".zip");
    }

    private static String leafName(String rawName) {
        String normalized = rawName.replace('\\', '/');
        int lastSlash = normalized.lastIndexOf('/');
        return lastSlash < 0 ? normalized : normalized.substring(lastSlash + 1);
    }

    private static String hex(long crc) {
        return crc < 0 ? null : HexFormat.of().toHexDigits((int) crc);
    }

    /**
     * Fully read bytes of a single archive entry plus its CRC-32
     */
    private record EntryPayload(byte[] data, long crc32) {
        int size() {
            return data.length;
        }
    }
}
