package com.app.zipcodec.dto.request;

import com.app.zipcodec.model.ArchiveNode;
import com.app.zipcodec.shared.enums.EncodingVariant;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Archive tree to rebuild into a ZIP")
public record RebuildRequest(@NotNull @Valid ArchiveNode.Directory root, EncodingVariant variant) {
}
