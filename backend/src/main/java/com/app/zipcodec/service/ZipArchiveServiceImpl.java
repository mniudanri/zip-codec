package com.app.zipcodec.service;

import com.app.zipcodec.config.ArchiveProperties;
import com.app.zipcodec.dto.ArchiveManifest;
import com.app.zipcodec.dto.DecodedArchive;
import com.app.zipcodec.dto.EncodedArchive;
import com.app.zipcodec.dto.response.EncodeResponse;
import com.app.zipcodec.dto.response.ExplodeResponse;
import com.app.zipcodec.model.ArchiveLimits;
import com.app.zipcodec.model.ArchiveNode;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import com.app.zipcodec.shared.exceptions.InvalidPayloadException;
import com.app.zipcodec.shared.helper.*;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Arrays;
import java.util.Locale;


/**
 * handle use-case: encode, decode
 *
 * <p>Every inbound archive is first spooled to disk. That gives the reader random
 * access (required to read the central directory) and lets the policy be enforced
 * against the real byte count rather than a declared one.
 */
@Service
public class ZipArchiveServiceImpl implements ZipArchiveService {
    private static final Logger log = LoggerFactory.getLogger(ZipArchiveServiceImpl.class);
    private static final byte[] LOCAL_FILE_HEADER = {'P', 'K', 0x03, 0x04};
    private static final byte[] EMPTY_ARCHIVE_HEADER = {'P', 'K', 0x05, 0x06};
    private static final byte[] END_OF_CENTRAL_DIRECTORY = {'P', 'K', 0x05, 0x06};
    // Maximum distance of the EOCD record from the end: 22 fixed bytes + a 64 KB comment
    private static final int EOCD_SEARCH_WINDOW = 22 + 0xFFFF;

    private final TempFileGenerator spool;
    private final ZipArchiveReader reader;
    private final ZipArchiveWriter writer;
    private final Base64Codec base64Codec;
    private final ArchiveProperties properties;
    private final EncodingHelper helper;

    public ZipArchiveServiceImpl(TempFileGenerator spool, ZipArchiveReader reader, ZipArchiveWriter writer,
                             Base64Codec base64Codec, ArchiveProperties properties, EncodingHelper helper) {
        this.spool = spool;
        this.reader = reader;
        this.writer = writer;
        this.base64Codec = base64Codec;
        this.properties = properties;
        this.helper = helper;
    }

    /**
     * Mode A — spool the upload, validate it against the policy without extracting
     * anything, then encode the raw bytes.
     */
    @Override
    public EncodeResponse encode(InputStream source, String filename, EncodingVariant requested) {
        EncodingVariant variant = helper.variantOf(requested);
        ArchiveLimits archiveLimits = properties.toLimits();

        long startedAt = System.nanoTime();
        log.info("encode started: filename={}", filename);

        try (TempFileGenerator.Payload payload = spool.spool(source, archiveLimits.maxUploadBytes())) {
            // Dry run: rejects zip slip, zip bombs and oversized archives before a
            // single byte is encoded.
            ZipArchiveReader.Content inspection = reader.read(payload.path(), new ZipArchiveReader.Options(
                    archiveLimits, false, false, properties.encoding().entryNameCharset(), variant));

            long encodedLength = variant.encodedLength(payload.sizeBytes());
            helper.assertInlineLimit(encodedLength);

            String base64 = helper.encodeToString(payload, variant, encodedLength);
            ArchiveManifest manifest = new ArchiveManifest(
                    filename, payload.sizeBytes(), payload.sha256(), inspection.entryCount(),
                    inspection.maxDepth(), variant, base64.length(), inspection.entryNameCharset());

            log.info("encode finished: filename={} bytes={} entries={} base64Chars={} in {} ms",
                    filename, payload.sizeBytes(), inspection.entryCount(), base64.length(), millisSince(startedAt));

            return new EncodeResponse(manifest, base64);
        }
    }

    /**
     * Inverse of {@link #encode}. The archive is materialized and verified
     * <em>before</em> it is handed back: validating inside the response stream
     * would come too late, the 200 status having already been committed.
     */
    @Override
    public DecodedArchive decode(String base64, EncodingVariant requested, String expectedSha256) {
        if (base64 == null || base64.isBlank()) {
            throw new InvalidPayloadException("Base64 payload must not be empty");
        }
        log.info("decode started: base64Chars={}", base64.length());
        return decode(new ByteArrayInputStream(base64.getBytes(StandardCharsets.US_ASCII)),
                requested, expectedSha256);
    }

    /**
     * Decode {@param Base64} string to decoded object file.
     *
     */
    public DecodedArchive decode(InputStream base64Text, EncodingVariant requested, String expectedSha256) {
        EncodingVariant variant = helper.variantOf(requested);
        long startedAt = System.nanoTime();

        TempFileGenerator.Payload payload = helper.spoolDecoded(base64Text, variant);
        try {
            if (payload.sizeBytes() == 0) {
                throw new InvalidPayloadException("Base64 payload must not be empty");
            }
            assertZipHeader(payload);
            assertNotTruncated(payload);
            assertDigestMatches(expectedSha256, payload.sha256());
        } catch (RuntimeException e) {
            payload.close();
            throw e;
        }
        log.info("decode finished: bytes={} in {} ms", payload.sizeBytes(), millisSince(startedAt));
        return new DecodedArchive(payload);
    }

    /**
     * Mode B — expand the archive into a recursive tree. With
     * {@param includeContent = false} this is the cheap inspect variant that never
     * reads entry data.
     */
    @Override
    public ExplodeResponse explode(InputStream source, String filename, EncodingVariant requested,
                                   boolean includeContent, boolean recurseNestedArchives) {
        EncodingVariant variant = helper.variantOf(requested);

        ArchiveLimits limits = properties.toLimits();
        long startedAt = System.nanoTime();

        log.info("explode started: filename={} includeContent={} recurse={}",
                filename, includeContent, recurseNestedArchives);

        try (TempFileGenerator.Payload payload = spool.spool(source, limits.maxUploadBytes())) {
            ZipArchiveReader.Content content = reader.read(payload.path(), new ZipArchiveReader.Options(
                    limits, includeContent, recurseNestedArchives,
                    properties.encoding().entryNameCharset(), variant));

            ArchiveManifest manifest = new ArchiveManifest(
                    filename, payload.sizeBytes(), payload.sha256(), content.entryCount(),
                    content.maxDepth(), includeContent ? variant : null, 0L, content.entryNameCharset());

            log.info("explode finished: filename={} bytes={} entries={} in {} ms",
                    filename, payload.sizeBytes(), content.entryCount(), millisSince(startedAt));

            return new ExplodeResponse(manifest, content.root());
        }
    }

    /** Inverse of {@link #explode}: turns a client-supplied tree back into a ZIP. */
    @Override
    public DecodedArchive rebuild(ArchiveNode.Directory root, EncodingVariant requested) {
        if (root == null) {
            throw new InvalidPayloadException("Archive tree must not be null");
        }

        EncodingVariant variant = helper.variantOf(requested);
        ArchiveLimits limits = properties.toLimits();
        long startedAt = System.nanoTime();

        log.info("rebuild started");

        DecodedArchive rebuilt = new DecodedArchive(
                spool.spool(target -> writer.write(root, limits, variant, target), limits.maxUploadBytes()));

        log.info("rebuild finished: bytes={} in {} ms", rebuilt.sizeBytes(), millisSince(startedAt));

        return rebuilt;
    }

    /**
     * Streaming encode, the archive is validated up front,
     * then its Base64 is written straight to the caller in fixed-size chunks.
     *
     * {@link #encode} has to materialize the whole Base64 string — roughly 1.37x
     * the archive, so that it can be embedded in a JSON document. A 100 MB archive
     * therefore becomes a ~133 MB single-line JSON response, which streams fine to
     * {@param curl} but overwhelms GUI clients that buffer and pretty-print the body.
     * This variant keeps memory constant and emits text/plain, so the output
     * can simply be redirected to a file.
     */
    @Override
    public EncodedArchive encodeStreaming(InputStream source, String filename, EncodingVariant requested) {
        EncodingVariant variant = helper.variantOf(requested);
        ArchiveLimits limits = properties.toLimits();
        long startedAt = System.nanoTime();

        log.info("encode-stream started: filename={}", filename);

        TempFileGenerator.Payload payload = spool.spool(source, limits.maxUploadBytes());
        try {
            // validate before a single byte is written: once the body has started
            ZipArchiveReader.Content inspection = reader.read(payload.path(), new ZipArchiveReader.Options(
                    limits, false, false, properties.encoding().entryNameCharset(), variant));

            ArchiveManifest manifest = new ArchiveManifest(
                    filename, payload.sizeBytes(), payload.sha256(), inspection.entryCount(),
                    inspection.maxDepth(), variant, variant.encodedLength(payload.sizeBytes()),
                    inspection.entryNameCharset());

            log.info("encode-stream validated: filename={} bytes={} entries={} base64Chars={} in {} ms",
                    filename, payload.sizeBytes(), inspection.entryCount(), manifest.base64Length(),
                    millisSince(startedAt));

            return new EncodedArchive(payload, manifest, base64Codec);
        } catch (RuntimeException e) {
            payload.close();
            throw e;
        }
    }

    private long millisSince(long startedAtNanos) {
        return (System.nanoTime() - startedAtNanos) / 1_000_000;
    }

    private void assertZipHeader(TempFileGenerator.Payload payload) {
        byte[] header = new byte[4];
        try (InputStream in = Files.newInputStream(payload.path())) {
            int read = in.readNBytes(header, 0, header.length);
            boolean valid = read == header.length
                    && (Arrays.equals(header, LOCAL_FILE_HEADER) || Arrays.equals(header, EMPTY_ARCHIVE_HEADER));
            if (!valid) {
                throw new InvalidArchiveException("Decoded payload is not a ZIP archive");
            }
        } catch (IOException e) {
            throw new InvalidArchiveException("Failed to inspect the decoded payload", e);
        }
    }

    /**
     * Rejects an archive whose end-of-central-directory record is missing.
     *
     * <p>A Base64 payload cut short still decodes to bytes that begin with a valid
     * local-file header, so {@link #assertZipHeader} alone would hand the caller a
     * file that only fails when they try to open it. The EOCD sits at the very end
     * of a ZIP, which makes its absence a direct test for truncation.
     */
    private void assertNotTruncated(TempFileGenerator.Payload payload) {
        long size = payload.sizeBytes();
        int window = (int) Math.min(size, EOCD_SEARCH_WINDOW);
        byte[] tail = new byte[window];
        try (InputStream in = Files.newInputStream(payload.path())) {
            in.skipNBytes(size - window);
            if (in.readNBytes(tail, 0, window) != window) {
                throw new InvalidArchiveException("Failed to inspect the decoded payload");
            }
        } catch (IOException e) {
            throw new InvalidArchiveException("Failed to inspect the decoded payload", e);
        }
        if (lastIndexOf(tail, END_OF_CENTRAL_DIRECTORY) < 0) {
            throw new InvalidPayloadException(("Decoded payload is a truncated ZIP archive: %d bytes decoded but the "
                    + "end-of-central-directory record is missing. The Base64 was cut short in transit — "
                    + "command shells cap a pasted argument (cmd.exe at 8191 characters), so send it from a "
                    + "file with --data-binary @file.b64 instead of pasting it.").formatted(size));
        }
    }
    private static int lastIndexOf(byte[] haystack, byte[] needle) {
        for (int i = haystack.length - needle.length; i >= 0; i--) {
            if (Arrays.equals(haystack, i, i + needle.length, needle, 0, needle.length)) {
                return i;
            }
        }
        return -1;
    }

    private void assertDigestMatches(String expectedSha256, String actualSha256) {
        if (expectedSha256 == null || expectedSha256.isBlank()) {
            return;
        }
        if (!expectedSha256.trim().toLowerCase(Locale.ROOT).equals(actualSha256)) {
            throw new InvalidPayloadException(
                    "SHA-256 mismatch: expected %s but decoded %s".formatted(expectedSha256, actualSha256));
        }
    }
}
