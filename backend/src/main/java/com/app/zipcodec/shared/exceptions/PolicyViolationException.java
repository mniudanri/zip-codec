package com.app.zipcodec.shared.exceptions;

import com.app.zipcodec.shared.enums.ArchiveViolation;

/**
 * A safety limit was breached (zip slip, zip bomb, too deep)
 */
public class PolicyViolationException extends ArchiveException {
    private final ArchiveViolation violation;

    public PolicyViolationException(ArchiveViolation violation, String message) {
        super(message);
        this.violation = violation;
    }

    public ArchiveViolation violation() {
        return violation;
    }
}
