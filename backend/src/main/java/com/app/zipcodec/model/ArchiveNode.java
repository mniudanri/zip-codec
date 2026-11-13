package com.app.zipcodec.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * A node of the archive tree. This is both the internal model and the JSON representation
 *
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = ArchiveNode.Directory.class, name = "DIRECTORY"),
    @JsonSubTypes.Type(value = ArchiveNode.File.class, name = "FILE")
})
@JsonInclude(JsonInclude.Include.NON_NULL)
public sealed interface ArchiveNode {
    String name();

    // normalize, slash-separated path relative to the archive root.
    String path();

    /**
     * A directory. {@param nestedArchive} is true when the node represents a
     * ZIP file that was recursively expanded instead of encoded.
     */
    record Directory(String name, String path, boolean nestedArchive,
                     @Valid @NotNull List<ArchiveNode> children) implements ArchiveNode {
        public Directory {
            name = name == null ? "" : name;
            path = path == null ? "" : path;

            // tolerate a missing array so bean validation, not a constructor NPE,
            // reports the problem on inbound rebuild requests.
            children = children == null ? List.of() : List.copyOf(children);
        }

        public static Directory root(List<ArchiveNode> children) {
            return new Directory("", "", false, children);
        }
    }

    /**
     * A file represent for archive
     */
    record File(String name, @NotBlank String path, long sizeBytes, String mimeType,
                String crc32, @NotBlank String content) implements ArchiveNode {
        public File {
            name = name == null ? "" : name;
            if (sizeBytes < 0) {
                sizeBytes = 0;
            }
        }
        public boolean hasContent() {
            return content != null;
        }
    }
}