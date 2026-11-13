package com.app.zipcodec.controller;

import com.app.zipcodec.dto.DecodedArchive;
import com.app.zipcodec.dto.request.DecodeRequest;
import com.app.zipcodec.dto.request.RebuildRequest;
import com.app.zipcodec.dto.response.EncodeResponse;
import com.app.zipcodec.dto.response.ExplodeResponse;
import com.app.zipcodec.service.ZipArchiveService;
import com.app.zipcodec.shared.enums.EncodingVariant;
import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
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
}