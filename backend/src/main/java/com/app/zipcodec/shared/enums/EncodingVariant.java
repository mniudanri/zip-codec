package com.app.zipcodec.shared.enums;

import java.util.Base64;

/**
 * support base64 characters
 */
public enum EncodingVariant {

    STANDARD, // simple base64
    MIME, // RFC 2045, 76-character
    URL_SAFE; // RFC 4648, URL and filename safe.

    public Base64.Encoder encoder() {
        return switch (this) {
            case STANDARD -> Base64.getEncoder();
            case MIME -> Base64.getMimeEncoder();
            case URL_SAFE -> Base64.getUrlEncoder();
        };
    }

    public Base64.Decoder decoder() {
        return switch (this) {
            case STANDARD -> Base64.getDecoder();
            case MIME -> Base64.getMimeDecoder();
            case URL_SAFE -> Base64.getUrlDecoder();
        };
    }

    /**
     * exact encoded length for {@param rawLength} input bytes, including padding,
     * and used for {@link #MIME} the CRLF separators
     */
    public long encodedLength(long rawLength) {
        long groups = (rawLength + 2) / 3;
        long length = groups * 4;
        if (this == MIME && length > 0) {
            length += 2 * ((length - 1) / 76);
        }
        return length;
    }
}
