package com.app.zipcodec.dto.request;

import com.app.zipcodec.shared.enums.EncodingVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

@Schema(description = "Request decode base64 to zip")
public record DecodeRequest(
        @NotBlank String base64, EncodingVariant variant,

        @Pattern(regexp = "^$|^[a-fA-F0-9]{64}$", message = "expectedSha256 must be a 64-character hex digest")
        String expectedSha256
) {}
