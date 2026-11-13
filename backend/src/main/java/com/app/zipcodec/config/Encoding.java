package com.app.zipcodec.config;

import com.app.zipcodec.shared.enums.EncodingVariant;
import org.springframework.boot.context.properties.bind.DefaultValue;

import java.nio.charset.Charset;

/**
 * @param chunkSizeBytes       copy buffer; rounded up to a multiple of 3 (encode) or 4 (decode)
 * @param maxInlineBase64Chars ceiling for Base64 embedded in a JSON response; beyond it callers
 *                             are redirected to the streaming endpoint rather than handed a body
 *                             that most clients cannot buffer
 * @param entryNameCharset     fallback charset for entry names without the UTF-8 flag
 */
public record Encoding(@DefaultValue("STANDARD") EncodingVariant variant,
                @DefaultValue("49152") int chunkSizeBytes,
                @DefaultValue("33554432") long maxInlineBase64Chars,
                @DefaultValue("CP437") Charset entryNameCharset
) {}
