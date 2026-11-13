package com.app.zipcodec.config;

import org.springframework.boot.context.properties.bind.DefaultValue;

public record Limits(@DefaultValue("268435456") long maxUploadBytes,
              @DefaultValue("1073741824") long maxTotalUncompressedBytes,
              @DefaultValue("134217728") long maxEntryBytes,
              @DefaultValue("10000") int maxEntryCount,
              @DefaultValue("3") int maxNestingDepth,
              @DefaultValue("100") double maxCompressionRatio,
              @DefaultValue("1024") int maxPathLength
) {}