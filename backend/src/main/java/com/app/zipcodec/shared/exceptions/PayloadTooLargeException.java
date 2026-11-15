package com.app.zipcodec.shared.exceptions;

/**
 * payload exceeds the configured max size
 */
public class PayloadTooLargeException extends ArchiveException {
    public PayloadTooLargeException(String message) {
        super(message);
    }
}
