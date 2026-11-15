package com.app.zipcodec.controller;

import com.app.zipcodec.dto.ArchiveManifest;
import com.app.zipcodec.dto.DecodedArchive;
import com.app.zipcodec.dto.EncodedArchive;
import com.app.zipcodec.dto.request.DecodeRequest;
import com.app.zipcodec.dto.request.RebuildRequest;
import com.app.zipcodec.dto.response.EncodeResponse;
import com.app.zipcodec.dto.response.ExplodeResponse;
import com.app.zipcodec.service.ZipArchiveService;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;

@RestController
@RequestMapping("/api/v1/archives") // API version 1.0
@Tag(name = "Archives", description = "Convert ZIP archives to Base64 and back")
public class ZipArchiveController {
    private final ZipArchiveService service;

    public ZipArchiveController(ZipArchiveService service) {
        this.service = service;
    }

    @Operation(summary = "Encode a whole ZIP archive as a single Base64 string")
    @PostMapping(path = "/encode", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public EncodeResponse encode(@RequestPart("file") MultipartFile file,
                                 @RequestParam(value = "variant", required = false)
                                           EncodingVariant variant) {
        try (InputStream source = open(file)) {
            return service.encode(source, file.getOriginalFilename(), variant);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read the uploaded archive", e);
        }
    }

    @Operation(summary = "Decode a Base64 string back into the original ZIP archive")
    @PostMapping(path = "/decode", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<StreamingResponseBody> decode(@Valid @RequestBody DecodeRequest request) {
        return zipResponse("decoded.zip",
                service.decode(request.base64(), request.variant(), request.expectedSha256()));
    }

    @Operation(summary = "Expand a ZIP archive into a recursive tree with per-entry Base64")
    @PostMapping(path = "/explode", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ExplodeResponse explode(@RequestPart("file") MultipartFile file,
                                   @RequestParam(value = "variant", required = false)
                                             EncodingVariant variant,
                                   @RequestParam(value = "recurse", defaultValue = "false")
                                             boolean recurse) {
        return expand(file, variant, true, recurse);
    }

    @Operation(summary = "Rebuild a ZIP archive from a tree of Base64-encoded entries")
    @PostMapping(path = "/rebuild", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<StreamingResponseBody> rebuild(@Valid @RequestBody RebuildRequest request) {
        return zipResponse("rebuilt.zip", service.rebuild(request.root(), request.variant()));
    }

    @Operation(summary = "List the archive tree without reading or encoding any entry data")
    @PostMapping(path = "/inspect", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ExplodeResponse inspect(@RequestPart("file") MultipartFile file) {
        return expand(file, null, false, false);
    }

    @Operation(summary = "Stream the Base64 of a ZIP archive as text/plain, in constant memory",
            description = "Same bytes as /encode, without wrapping them in JSON. Preferred for large archives "
                    + "and for GUI clients, which struggle to render a multi-megabyte single-line JSON body.")
    @PostMapping(path = "/encode/stream", consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<StreamingResponseBody> encodeStream(@RequestPart("file") MultipartFile file,
                                                              @RequestParam(value = "variant", required = false)
                                                              EncodingVariant variant) {
        EncodedArchive encoded;
        try (InputStream source = open(file)) {
            encoded = service.encodeStreaming(source, file.getOriginalFilename(), variant);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read the uploaded archive", e);
        }

        ArchiveManifest manifest = encoded.manifest();
        StreamingResponseBody body = target -> {
            try (EncodedArchive resource = encoded) {
                resource.writeBase64(target);
            }
        };
        // The manifest travels in headers because the body is raw Base64; the exact
        // length is known up front, so clients still get a determinate progress bar.
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(base64Filename(manifest.filename())).build().toString())
                .header("X-Archive-Sha256", manifest.sha256())
                .header("X-Archive-Size-Bytes", Long.toString(manifest.sizeBytes()))
                .header("X-Archive-Entry-Count", Integer.toString(manifest.entryCount()))
                .header("X-Archive-Max-Depth", Integer.toString(manifest.maxDepth()))
                .header("X-Archive-Variant", manifest.variant().name())
                .contentType(MediaType.TEXT_PLAIN)
                .contentLength(manifest.base64Length())
                .body(body);
    }

    @Operation(summary = "Decode a raw Base64 body (text/plain) back into the original ZIP archive",
            description = "Inverse of /encode/stream. Takes the Base64 as the request body rather than a JSON "
                    + "field, so no JSON escaping or shell quoting is involved.")
    @PostMapping(path = "/decode/stream", consumes = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<StreamingResponseBody> decodeStream(
            HttpServletRequest request,
            @RequestParam(value = "variant", required = false) EncodingVariant variant,
            @RequestParam(value = "expectedSha256", required = false) String expectedSha256) {
        try (InputStream body = request.getInputStream()) {
            return zipResponse("decoded.zip", service.decode(body, variant, expectedSha256));
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read the Base64 request body", e);
        }
    }

    private InputStream open(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new InvalidArchiveException("No archive was uploaded");
        }
        return file.getInputStream();
    }

    /**
     * The archive has already been produced and validated, so streaming it here can
     * only fail on transport errors. the temporary file is released afterward.
     */
    private ResponseEntity<StreamingResponseBody> zipResponse(String filename, DecodedArchive archive) {
        ContentDisposition disposition = ContentDisposition.attachment().filename("decoded.zip").build();
        StreamingResponseBody body = target -> {
            try (DecodedArchive resource = archive; InputStream source = resource.open()) {
                source.transferTo(target);
            }
        };

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header("X-Archive-Sha256", archive.sha256())
                .contentType(new MediaType("application", "zip"))
                .contentLength(archive.sizeBytes())
                .body(body);
    }

    private ExplodeResponse expand(MultipartFile file, EncodingVariant variant, boolean includeContent, boolean recurse) {
        try (InputStream source = open(file)) {
            return service.explode(source, file.getOriginalFilename(), variant, includeContent, recurse);
        } catch (IOException e) {
            throw new UncheckedIOException("Failed to read the uploaded archive", e);
        }
    }

    private static String base64Filename(String originalFilename) {
        String base = originalFilename == null || originalFilename.isBlank() ? "archive" : originalFilename;
        return base + ".b64.txt";
    }
}