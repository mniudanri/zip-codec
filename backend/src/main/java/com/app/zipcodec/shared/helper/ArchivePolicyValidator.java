package com.app.zipcodec.shared.helper;

import com.app.zipcodec.shared.enums.ArchiveViolation;
import com.app.zipcodec.shared.exceptions.PolicyViolationException;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class ArchivePolicyValidator {
    /**
     * Normalizes a ZIP entry name and rejects anything that could escape the
     * extraction root ("Zip Slip", CVE-2018-1002200 and relatives).
     *
     * @return the normalized, slash-separated, root-relative path
     */
    public String sanitizePath(String rawName, int maxPathLength) {
        if (rawName == null || rawName.isBlank()) {
            throw new PolicyViolationException(ArchiveViolation.PATH_TRAVERSAL, "Entry name is empty");
        }
        if (rawName.indexOf('\0') >= 0) {
            throw new PolicyViolationException(ArchiveViolation.PATH_TRAVERSAL, "Entry name contains a NUL byte");
        }
        String candidate = rawName.replace('\\', '/');
        if (candidate.startsWith("/")) {
            throw new PolicyViolationException(ArchiveViolation.ABSOLUTE_PATH, "Absolute entry name rejected: " + rawName);
        }
        if (hasWindowsDriveLetter(candidate)) {
            throw new PolicyViolationException(ArchiveViolation.ABSOLUTE_PATH,
                    "Drive-qualified entry name rejected: " + rawName);
        }

        List<String> segments = new ArrayList<>();
        for (String segment : candidate.split("/")) {
            if (segment.isEmpty() || ".".equals(segment)) {
                continue;
            }
            if ("..".equals(segment)) {
                throw new PolicyViolationException(ArchiveViolation.PATH_TRAVERSAL,
                        "Path traversal segment rejected: " + rawName);
            }
            segments.add(segment);
        }

        if (segments.isEmpty()) {
            throw new PolicyViolationException(ArchiveViolation.PATH_TRAVERSAL,
                    "Entry name normalizes to the archive root: " + rawName);
        }

        String normalized = String.join("/", segments);
        if (normalized.length() > maxPathLength) {
            throw new PolicyViolationException(ArchiveViolation.PATH_TOO_LONG,
                    "Entry path exceeds %d characters".formatted(maxPathLength));
        }
        return normalized;
    }

    private boolean hasWindowsDriveLetter(String candidate) {
        return candidate.length() >= 2
                && candidate.charAt(1) == ':'
                && Character.isLetter(candidate.charAt(0));
    }
}
