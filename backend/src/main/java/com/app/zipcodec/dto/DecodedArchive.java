package com.app.zipcodec.dto;

import com.app.zipcodec.shared.helper.TempFileGenerator;

import java.io.InputStream;

/**
 * A verified ZIP living in the spool directory; closing deletes it
 */
public record DecodedArchive(TempFileGenerator.Payload payload) implements AutoCloseable {
    public InputStream open() {
        return payload.open();
    }
    public long sizeBytes() {
        return payload.sizeBytes();
    }
    public String sha256() {
        return payload.sha256();
    }

    @Override
    public void close() {
        payload.close();
    }
}