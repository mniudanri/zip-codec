package com.app.zipcodec.shared.helper;

import com.app.zipcodec.config.ArchiveProperties;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.ArchiveException;
import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import com.app.zipcodec.shared.exceptions.InvalidPayloadException;
import com.app.zipcodec.shared.exceptions.PayloadTooLargeException;
import org.springframework.stereotype.Component;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

@Component
public class EncodingHelper {
    private final ArchiveProperties properties;
    private final Base64Codec base64Codec;
    private final TempFileGenerator generator;

    public EncodingHelper(ArchiveProperties properties, Base64Codec base64Codec, TempFileGenerator generator) {
        this.properties = properties;
        this.base64Codec = base64Codec;
        this.generator = generator;
    }

    public EncodingVariant variantOf(EncodingVariant requested) {
        return requested == null ? properties.encoding().variant() : requested;
    }

    public String encodeToString(TempFileGenerator.Payload payload, EncodingVariant variant, long encodedLength) {
        ByteArrayOutputStream sink = new ByteArrayOutputStream(Math.toIntExact(encodedLength));
        try (InputStream source = payload.open()) {
            base64Codec.encode(source, sink, variant);
        } catch (ArchiveException e) {
            throw e;
        } catch (IOException e) {
            throw new InvalidArchiveException("Failed to read the spooled archive", e);
        }
        return sink.toString(StandardCharsets.US_ASCII);
    }

    public void assertInlineLimit(long encodedLength) {
        long maxInline = properties.encoding().maxInlineBase64Chars();
        if (encodedLength > maxInline) {
            throw new PayloadTooLargeException(("Encoded payload would be %d characters, above the inline limit of %d. "
                    + "Use POST /api/v1/archives/encode/stream, which streams the same Base64 as text/plain, "
                    + "or raise archive.encoding.max-inline-base64-chars.")
                    .formatted(encodedLength, maxInline));
        }
    }

    /**
     * The Base64 source is an in-memory string, so any failure raised here can only
     * come from the decoder rejecting an illegal character.
     */
    public TempFileGenerator.Payload spoolDecoded(InputStream text, EncodingVariant variant) {
        try (InputStream decoding = base64Codec.decodingStream(text, variant)) {
            return generator.spool(decoding, properties.toLimits().maxUploadBytes());
        } catch (UncheckedIOException e) {
            throw new InvalidPayloadException("Payload is not valid Base64: " + rootMessage(e), e);
        } catch (IOException e) {
            throw new InvalidPayloadException("Payload is not valid Base64: " + e.getMessage(), e);
        }
    }

    private static String rootMessage(Throwable e) {
        Throwable cause = e.getCause() == null ? e : e.getCause();
        return cause.getMessage();
    }
}
