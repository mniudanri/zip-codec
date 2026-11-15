package com.app.zipcodec.shared.helper;

import com.app.zipcodec.model.ArchiveBudget;
import com.app.zipcodec.model.ArchiveLimits;
import com.app.zipcodec.model.ArchiveNode;
import com.app.zipcodec.shared.enums.ArchiveViolation;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import com.app.zipcodec.shared.exceptions.PolicyViolationException;
import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;
import org.apache.commons.io.output.CloseShieldOutputStream;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * Rebuilds a ZIP from a client-supplied tree
 *
 */
@Component
public class ZipArchiveWriter {
    private final Base64Codec base64Codec;
    private final ArchivePolicyValidator policyValidator;

    public ZipArchiveWriter(Base64Codec base64Codec, ArchivePolicyValidator policyValidator) {
        this.base64Codec = base64Codec;
        this.policyValidator = policyValidator;
    }

    public void write(ArchiveNode.Directory root, ArchiveLimits limits, EncodingVariant variant, OutputStream target) {
        ArchiveBudget budget = new ArchiveBudget(limits);

        try (ZipArchiveOutputStream zip = new ZipArchiveOutputStream(CloseShieldOutputStream.wrap(target))) {
            zip.setEncoding(StandardCharsets.UTF_8.name());
            zip.setUseLanguageEncodingFlag(true);
            Deque<ArchiveNode> stack = new ArrayDeque<>(root.children());

            while (!stack.isEmpty()) {
                ArchiveNode node = stack.pop();

                switch (node) {
                    case ArchiveNode.Directory directory -> {
                        writeDirectory(zip, directory, limits, budget);
                        directory.children().forEach(stack::push);
                    }
                    case ArchiveNode.File file -> writeFile(zip, file, limits, budget, variant);
                }
            }
            zip.finish();
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to rebuild the archive", e);
        }
    }
    private void writeDirectory(ZipArchiveOutputStream zip,
                                ArchiveNode.Directory directory,
                                ArchiveLimits limits,
                                ArchiveBudget budget) throws IOException {
        if (directory.nestedArchive()) {
            throw new InvalidArchiveException(
                "Cannot rebuild expanded nested archive '%s'; request it with recurse=false"
                    .formatted(directory.path()));
        }

        String path = policyValidator.sanitizePath(directory.path(), limits.maxPathLength());
        budget.registerEntry();
        zip.putArchiveEntry(new ZipArchiveEntry(path + "/"));
        zip.closeArchiveEntry();
    }
    private void writeFile(ZipArchiveOutputStream zip, ArchiveNode.File file, ArchiveLimits limits,
                           ArchiveBudget budget, EncodingVariant variant) throws IOException {
        if (!file.hasContent()) {
            throw new PolicyViolationException(ArchiveViolation.UNSUPPORTED_ENTRY_TYPE,
                "File '%s' carries no Base64 content; a metadata-only tree cannot be rebuilt"
                    .formatted(file.path()));
        }

        String path = policyValidator.sanitizePath(file.path(), limits.maxPathLength());
        budget.registerEntry();

        byte[] data = base64Codec.decodeToBytes(file.content(), variant);
        budget.charge(path, data.length, data.length);
        ZipArchiveEntry entry = new ZipArchiveEntry(path);
        entry.setSize(data.length);

        zip.putArchiveEntry(entry);
        zip.write(data);
        zip.closeArchiveEntry();
    }
}