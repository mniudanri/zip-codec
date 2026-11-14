package com.app.zipcodec.model;

import com.app.zipcodec.shared.enums.ArchiveViolation;
import com.app.zipcodec.shared.exceptions.PolicyViolationException;

/**
 * single-threaded accumulator refer to {@link ArchiveLimits} while an archive is being streamed
 */
public final class ArchiveBudget {
    private final ArchiveLimits limits;
    private long totalUncompressedBytes;
    private int entryCount;

    public ArchiveBudget(ArchiveLimits limits) {
        this.limits = limits;
    }

    /**
     * Registers one more entry and fails fast when the count ceiling is hit
     */
    public void registerEntry() {
        if (++entryCount > limits.maxEntryCount()) {
            throw new PolicyViolationException(ArchiveViolation.ENTRY_COUNT_EXCEEDED,
                    "Archive contains more than %d entries".formatted(limits.maxEntryCount()));
        }
    }

    public void requireDepthAllowed(int depth) {
        if (depth > limits.maxNestingDepth()) {
            throw new PolicyViolationException(ArchiveViolation.NESTING_TOO_DEEP,
                    "Nested archive depth %d exceeds the maximum of %d"
                            .formatted(depth, limits.maxNestingDepth()));
        }
    }

    /**
     * Charges {@param bytes} expanded bytes of a single entry against both the
     * per-entry and the global budget.
     *
     * @param entryBytesSoFar running total for the current entry, including {@param bytes}
     */
    public void charge(String entryName, long bytes, long entryBytesSoFar) {
        if (entryBytesSoFar > limits.maxEntryBytes()) {
            throw new PolicyViolationException(ArchiveViolation.ENTRY_SIZE_EXCEEDED,
                    "Entry '%s' exceeds the per-entry limit of %d bytes"
                            .formatted(entryName, limits.maxEntryBytes()));
        }
        totalUncompressedBytes += bytes;
        if (totalUncompressedBytes > limits.maxTotalUncompressedBytes()) {
            throw new PolicyViolationException(ArchiveViolation.TOTAL_SIZE_EXCEEDED,
                    "Expanded archive exceeds the total limit of %d bytes"
                            .formatted(limits.maxTotalUncompressedBytes()));
        }
    }

    /**
     * Zip-bomb guard. Called after an entry has been fully read, when both the
     * compressed and the real uncompressed size are known.
     */
    public void verifyCompressionRatio(String entryName, long compressedSize, long uncompressedSize) {
        if (compressedSize <= 0 || uncompressedSize <= 0) {
            return;
        }
        double ratio = (double) uncompressedSize / compressedSize;
        if (ratio > limits.maxCompressionRatio()) {
            throw new PolicyViolationException(ArchiveViolation.COMPRESSION_RATIO_EXCEEDED,
                    "Entry '%s' has a compression ratio of %.1f:1, above the maximum of %.1f:1"
                            .formatted(entryName, ratio, limits.maxCompressionRatio()));
        }
    }

    public int entryCount() {
        return entryCount;
    }
}
