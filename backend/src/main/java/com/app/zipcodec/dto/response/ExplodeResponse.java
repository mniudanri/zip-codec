package com.app.zipcodec.dto.response;

import com.app.zipcodec.dto.ArchiveManifest;
import com.app.zipcodec.model.ArchiveNode;
import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Recursive archive tree, optionally carrying per-file base64")
public record ExplodeResponse(ArchiveManifest manifest, ArchiveNode.Directory root) {
}
