package com.app.zipcodec.shared.helper;

import com.app.zipcodec.config.ArchiveProperties;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.InvalidPayloadException;
import org.apache.commons.io.input.CloseShieldInputStream;
import org.apache.commons.io.output.CloseShieldOutputStream;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;

/**
 * base64 operations
 *
 */
@Component
public class Base64Codec {
    private final int encodeChunkSize;
    private final int decodeChunkSize;

    public Base64Codec(ArchiveProperties properties) {
        int chunkSizeBytes = properties.encoding().chunkSizeBytes();
        this.encodeChunkSize = roundUpToMultipleOf(chunkSizeBytes, 3);
        this.decodeChunkSize = roundUpToMultipleOf(chunkSizeBytes, 4);
    }

    /** encodes {@param source} into {@param target}; neither stream is closed. */
    public long encode(InputStream source, OutputStream target, EncodingVariant variant) {
        try (OutputStream encoding = variant.encoder().wrap(CloseShieldOutputStream.wrap(target))) {
            return copy(source, encoding, encodeChunkSize);
        } catch (IOException e) {
            throw new UncheckedIOException("Base64 encoding failed", e);
        }
    }
    /** Decodes {@param source} into {@param target}; neither stream is closed. */
    public long decode(InputStream source, OutputStream target, EncodingVariant variant) {
        try (InputStream decoding = decodingStream(source, variant)) {
            return copy(decoding, target, decodeChunkSize);
        } catch (IllegalArgumentException e) {
            throw new InvalidPayloadException("Payload is not valid Base64: " + e.getMessage(), e);
        } catch (IOException e) {
            throw new UncheckedIOException("Base64 decoding failed", e);
        }
    }
    /**
     * wraps {@param source} in a decoding view so callers can pipe base64 text
     */
    public InputStream decodingStream(InputStream source, EncodingVariant variant) {
        return variant.decoder().wrap(CloseShieldInputStream.wrap(source));
    }

    public String encodeToString(byte[] data, EncodingVariant variant) {
        return variant.encoder().encodeToString(data);
    }

    public byte[] decodeToBytes(String payload, EncodingVariant variant) {
        try {
            return variant.decoder().decode(payload);
        } catch (IllegalArgumentException e) {
            throw new InvalidPayloadException("Payload is not valid Base64: " + e.getMessage(), e);
        }
    }

    private long copy(InputStream source, OutputStream target, int chunkSize) throws IOException {
        byte[] buffer = new byte[chunkSize];
        long total = 0;
        int read;
        while ((read = source.read(buffer)) != -1) {
            target.write(buffer, 0, read);
            total += read;
        }
        target.flush();
        return total;
    }

    private int roundUpToMultipleOf(int value, int multiple) {
        int positive = Math.max(value, multiple);
        return ((positive + multiple - 1) / multiple) * multiple;
    }
}