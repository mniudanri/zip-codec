package com.app.zipcodec.controller;

import com.app.zipcodec.ZipFixtures;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.RequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

@SpringBootTest
class ArchiveControllerIntegrationTest {

    @Autowired
    private WebApplicationContext context;

    private ObjectMapper objectMapper;
    private MockMvc mockMvc;
    private MockMvc mvc() {
        if (mockMvc == null) {
            mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
        }
        return mockMvc;
    }

    @BeforeEach
    void init() {
        if (objectMapper == null) {
            objectMapper = new ObjectMapper();
        }
    }
    @Test
    public void encodesAndDecodesAnArchiveByteForByte() throws Exception {
        byte[] archive = ZipFixtures.archive().withFile("docs/report.txt", "quarterly results").toBytes();
        String response = mvc().perform(multipart("/api/v1/archives/encode").file(upload(archive)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.manifest.entryCount").value(1))
            .andReturn().getResponse().getContentAsString();

        JsonNode encoded = objectMapper.readTree(response);
        String base64 = encoded.get("base64").asText();
        String sha256 = encoded.get("manifest").get("sha256").asText();
        assertThat(sha256).isEqualTo(sha256Of(archive));

        byte[] decoded = streamZip(post("/api/v1/archives/decode")
            .contentType(MediaType.APPLICATION_JSON)
            .content(objectMapper.writeValueAsString(
                Map.of("base64", base64, "expectedSha256", sha256))));

        assertThat(decoded).isEqualTo(archive);
    }


    @Test
    public void returnsProblemDetailWhenAnEntryEscapesTheArchiveRoot() throws Exception {
        byte[] malicious = ZipFixtures.archive().withFile("../../etc/passwd", "root:x:0:0").toBytes();
        mvc().perform(multipart("/api/v1/archives/encode").file(upload(malicious)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.title").value("Archive policy violation"))
            .andExpect(jsonPath("$.violation").value("PATH_TRAVERSAL"));
    }

    @Test
    public void rejectsPayloadsThatAreNotArchives() throws Exception {
        String notAZip = Base64.getEncoder().encodeToString("plain text".getBytes(StandardCharsets.UTF_8));
        mvc().perform(post("/api/v1/archives/decode")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("base64", notAZip))))
            .andExpect(status().isUnsupportedMediaType())
            .andExpect(jsonPath("$.title").value("Unreadable archive"));
    }
    @Test
    public void rejectsMalformedBase64() throws Exception {
        mvc().perform(post("/api/v1/archives/decode")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(Map.of("base64", "!!! not base64 !!!"))))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Malformed payload"));
    }

    @Test
    public void rejectsARequestWithoutABase64Payload() throws Exception {
        mvc().perform(post("/api/v1/archives/decode")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"base64\":\"\"}"))
            .andExpect(status().isBadRequest());
    }

    private byte[] streamZip(RequestBuilder request) throws Exception {
        MvcResult started = mvc().perform(request)
            .andExpect(status().isOk())
            .andExpect(request().asyncStarted())
            .andReturn();
        return mvc().perform(asyncDispatch(started))
            .andExpect(status().isOk())
            .andReturn().getResponse().getContentAsByteArray();
    }
    private static MockMultipartFile upload(byte[] archive) {
        return new MockMultipartFile("file", "bundle.zip", "application/zip", archive);
    }
    private static String sha256Of(byte[] data) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
    }
}