package com.app.zipcodec.config;

import com.app.zipcodec.model.ArchiveLimits;
import com.app.zipcodec.shared.enums.EncodingVariant;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;
import java.nio.charset.Charset;
import java.nio.file.Path;


/**
 * Configuration bound from archive.* path
 *
 */
@ConfigurationProperties(prefix = "archive")
public record ArchiveProperties(
        Limits limits,
        Encoding encoding,
        Path tempDir
) {

    public ArchiveProperties {
        if (tempDir == null) {
            tempDir = Path.of(System.getProperty("java.io.tmpdir"), "zip-codec");
        }
    }

    /**
     * Defaults matching, for tests and manual wiring
     */
    public ArchiveProperties defaults(Path tempDir) {
        return new ArchiveProperties(
                new Limits(268_435_456L, 1_073_741_824L, 134_217_728L, 10_000, 3, 100.0, 1024),
                new Encoding(EncodingVariant.STANDARD, 49_152, 33_554_432L, Charset.forName("CP437")),
                tempDir);
    }

    public ArchiveLimits toLimits() {
        return new ArchiveLimits(
                limits.maxUploadBytes(),
                limits.maxTotalUncompressedBytes(),
                limits.maxEntryBytes(),
                limits.maxEntryCount(),
                limits.maxNestingDepth(),
                limits.maxCompressionRatio(),
                limits.maxPathLength());
    }
}
