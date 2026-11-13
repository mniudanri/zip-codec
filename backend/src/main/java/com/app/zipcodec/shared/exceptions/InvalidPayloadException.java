package com.app.zipcodec.shared.exceptions;

/**
 * requested base64 payload or node tree is malformed
 */
public class InvalidPayloadException extends ArchiveException {
    public InvalidPayloadException(String message) {
        super(message);
    }
    public InvalidPayloadException(String message, Throwable cause) {
        super(message, cause);
    }
}
