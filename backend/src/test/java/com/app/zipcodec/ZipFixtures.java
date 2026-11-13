package com.app.zipcodec;

import org.apache.commons.compress.archivers.zip.ZipArchiveEntry;
import org.apache.commons.compress.archivers.zip.ZipArchiveOutputStream;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Builds in-memory ZIP fixtures, including deliberately malicious ones. */
public final class ZipFixtures {
    private final Map<String, byte[]> files = new LinkedHashMap<>();
    private final List<String> directories = new ArrayList<>();
    public static ZipFixtures archive() {
        return new ZipFixtures();
    }
    public ZipFixtures withFile(String path, byte[] content) {
        files.put(path, content);
        return this;
    }
    public ZipFixtures withFile(String path, String content) {
        return withFile(path, content.getBytes(StandardCharsets.UTF_8));
    }
    public ZipFixtures withDirectory(String path) {
        directories.add(path);
        return this;
    }
    public byte[] toBytes() {
        ByteArrayOutputStream sink = new ByteArrayOutputStream();
        try (ZipArchiveOutputStream zip = new ZipArchiveOutputStream(sink)) {
            zip.setEncoding(StandardCharsets.UTF_8.name());
            for (String directory : directories) {
                zip.putArchiveEntry(new ZipArchiveEntry(directory.endsWith("/") ? directory : directory + "/"));
                zip.closeArchiveEntry();
            }
            for (Map.Entry<String, byte[]> file : files.entrySet()) {
                ZipArchiveEntry entry = new ZipArchiveEntry(file.getKey());
                entry.setSize(file.getValue().length);
                zip.putArchiveEntry(entry);
                zip.write(file.getValue());
                zip.closeArchiveEntry();
            }
            zip.finish();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return sink.toByteArray();
    }
    public Path writeTo(Path directory, String filename) {
        try {
            Path file = directory.resolve(filename);
            Files.write(file, toBytes());
            return file;
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
    /** Highly compressible content, used to trigger the compression-ratio guard. */
    public static byte[] compressible(int size) {
        return new byte[size];
    }
}