package com.app.zipcodec.service;

import com.app.zipcodec.dto.DecodedArchive;
import com.app.zipcodec.dto.response.EncodeResponse;
import com.app.zipcodec.dto.response.ExplodeResponse;
import com.app.zipcodec.model.ArchiveNode;
import com.app.zipcodec.shared.enums.EncodingVariant;

import java.io.InputStream;


public interface ZipArchiveService {
    EncodeResponse encode(InputStream source, String filename, EncodingVariant requested);

    DecodedArchive decode(String base64, EncodingVariant requested, String expectedSha256);

    ExplodeResponse explode(InputStream source, String filename, EncodingVariant requested,
                                   boolean includeContent, boolean recurseNestedArchives);

    DecodedArchive rebuild(ArchiveNode.Directory root, EncodingVariant requested);
}
