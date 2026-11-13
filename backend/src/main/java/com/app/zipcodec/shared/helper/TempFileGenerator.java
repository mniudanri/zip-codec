package com.app.zipcodec.shared.helper;

import com.app.zipcodec.config.ArchiveProperties;
import com.app.zipcodec.shared.exceptions.PayloadTooLargeException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import java.io.FilterOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestOutputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Spools payloads to a dedicated temporary directory while computing the SHA-256
 * digest in the same pass, and aborts as soon as the configured ceiling is
 * exceeded so an oversized payload can never fill the disk
 */
@Component
public class TempFileGenerator {
    private static final Logger log = LoggerFactory.getLogger(TempFileGenerator.class);
    private final Path directory;
    private final ArchiveProperties properties;

    public TempFileGenerator(ArchiveProperties properties) {
        this.properties = properties;
        this.directory = properties.tempDir();
        try {
            Files.createDirectories(directory);
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create the spool directory " + directory, e);
        }
    }

    public Payload spool(InputStream source, long maxBytes) {
        return spool(source::transferTo, maxBytes);
    }

    public Payload spool(PayloadWriter writer, long maxBytes) {
        Path file = createTempFile();
        MessageDigest digest = sha256();
        LimitedOutputStream limited;

        try (OutputStream raw = Files.newOutputStream(file);
             DigestOutputStream digesting = new DigestOutputStream(raw, digest);
             LimitedOutputStream target = new LimitedOutputStream(digesting, maxBytes)) {

            limited = target;
            writer.writeTo(target);
            target.flush();

        } catch (IOException e) {
            deleteQuietly(file);
            throw new UncheckedIOException("Failed to spool the payload", e);

        } catch (RuntimeException e) {
            deleteQuietly(file);
            throw e;
        }
        return new Payload(file, limited.written(), HexFormat.of().formatHex(digest.digest()));
    }

    private Path createTempFile() {
        try {
            return Files.createTempFile(directory, "archive-", ".tmp");
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot create a spool file", e);
        }
    }

    private MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is required but unavailable", e);
        }
    }

    private static void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("Could not delete spool file {}", file, e);
        }
    }

    @FunctionalInterface
    public interface PayloadWriter {
        void writeTo(OutputStream target) throws IOException;
    }

    /**
     * A payload persisted to a temporary location together with the digest computed
     * while it was being written. Closing deletes the backing file.
     */
    public record Payload(Path path, long sizeBytes, String sha256) implements AutoCloseable {
        public InputStream open() {
            try {
                return Files.newInputStream(path);
            } catch (IOException e) {
                throw new UncheckedIOException("Failed to open the spooled payload", e);
            }
        }
        @Override
        public void close() {
            deleteQuietly(path);
        }
    }

    /**
     * Counts written bytes and fails fast once {@code maxBytes} is exceeded
     */
    private final class LimitedOutputStream extends FilterOutputStream {
        private final long maxBytes;
        private long written;

        private LimitedOutputStream(OutputStream delegate, long maxBytes) {
            super(delegate);
            this.maxBytes = maxBytes;
        }

        @Override
        public void write(int b) throws IOException {
            checkLimit(1);
            out.write(b);
            written++;
        }
        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            checkLimit(len);
            out.write(b, off, len);
            written += len;
        }
        private void checkLimit(int additional) {
            if (written + additional > maxBytes) {
                throw new PayloadTooLargeException("Payload exceeds the maximum of %d bytes".formatted(maxBytes));
            }
        }
        private long written() {
            return written;
        }
    }
}
