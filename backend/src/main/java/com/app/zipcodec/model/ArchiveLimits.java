package com.app.zipcodec.model;

public record ArchiveLimits(long maxUploadBytes, long maxTotalUncompressedBytes, long maxEntryBytes,
                            int maxEntryCount, int maxNestingDepth, double maxCompressionRatio, int maxPathLength) {

    /**
     * Immutable safety envelope applied to every archive operation.
     *
     * @param maxUploadBytes            largest accepted compressed upload
     * @param maxTotalUncompressedBytes global budget for expanded bytes (zip-bomb guard)
     * @param maxEntryBytes             largest single expanded entry
     * @param maxEntryCount             maximum number of entries, nested ones included
     * @param maxNestingDepth           how many nested archives may be opened
     * @param maxCompressionRatio       uncompressed/compressed ceiling per entry
     * @param maxPathLength             maximum normalized entry path length
     */
    public ArchiveLimits {
        requirePositive(maxUploadBytes, "maxUploadBytes");
        requirePositive(maxTotalUncompressedBytes, "maxTotalUncompressedBytes");
        requirePositive(maxEntryBytes, "maxEntryBytes");
        requirePositive(maxEntryCount, "maxEntryCount");
        requirePositive(maxPathLength, "maxPathLength");

        if (maxNestingDepth < 0) {
            throw new IllegalArgumentException("maxNestingDepth must not be negative");
        }
        if (maxCompressionRatio <= 1) {
            throw new IllegalArgumentException("maxCompressionRatio must be greater than 1");
        }
    }

    public static ArchiveLimits defaults() {
        return new ArchiveLimits(256L * 1024 * 1024, 1024L * 1024 * 1024, 128L * 1024 * 1024,
                10_000, 3, 100.0, 1024);
    }

    private static void requirePositive(long value, String field) {
        if (value <= 0) {
            throw new IllegalArgumentException(field + " must be positive");
        }
    }
}
