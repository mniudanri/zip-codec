package com.app.zipcodec.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/archives") // API version 1.0
public class ArchiveController {

    public ArchiveController() {
    }

    @PostMapping("/encode")
    public ResponseEntity<String> encode() {
        return null;
    }

    @PostMapping("/decode")
    public ResponseEntity<String> encodeStream() {
        return null;
    }
}