package com.app.zipcodec.dto.response;

import com.app.zipcodec.dto.ArchiveManifest;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Whole archive encoded as one Base64 string")
public record EncodeResponse(
        ArchiveManifest manifest,

        String base64
) {}
