package com.app.zipcodec.dto;

import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import com.app.zipcodec.shared.helper.Base64Codec;
import com.app.zipcodec.shared.helper.TempFileGenerator;

import java.io.IOException;
import java.io.InputStream;

/**
 * A validated archive whose Base64 is produced on demand, in constant memory.
 * Closing deletes the spooled file.
 */
public record EncodedArchive(TempFileGenerator.Payload payload,
                             ArchiveManifest manifest,
                             Base64Codec codec) implements AutoCloseable {

    /**
     * Streams the Base64 of the archive into {@param target}, which stays open
     */
    public void writeBase64(java.io.OutputStream target) {
        try (InputStream source = payload.open()) {
            codec.encode(source, target, manifest.variant());
        } catch (IOException e) {
            throw new InvalidArchiveException("Failed to read the spooled archive", e);
        }
    }

    @Override
    public void close() {
        payload.close();
    }
}
