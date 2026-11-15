package com.app.zipcodec.dto;

import com.app.zipcodec.shared.enums.EncodingVariant;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Result of processed archive")
public record ArchiveManifest(String filename, long sizeBytes, String sha256, int entryCount, int maxDepth,
                              EncodingVariant variant, long base64Length, String entryNameCharset) {
}
