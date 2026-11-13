package com.app.zipcodec.shared.exceptions;

/**
 * file's bytes are not a readable as ZIP archive
 */
public class InvalidArchiveException extends ArchiveException {
    public InvalidArchiveException(String message) {
        super(message);
    }
    public InvalidArchiveException(String message, Throwable cause) {
        super(message, cause);
    }
}
