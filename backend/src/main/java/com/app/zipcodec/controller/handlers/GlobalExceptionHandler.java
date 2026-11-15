package com.app.zipcodec.controller.handlers;

import com.app.zipcodec.shared.exceptions.InvalidArchiveException;
import com.app.zipcodec.shared.exceptions.InvalidPayloadException;
import com.app.zipcodec.shared.exceptions.PayloadTooLargeException;
import com.app.zipcodec.shared.exceptions.PolicyViolationException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import java.net.URI;


@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    private static final String TYPE_PREFIX = "https://example.com/problems/";

    @ExceptionHandler(PolicyViolationException.class)
    public ProblemDetail handlePolicyViolation(PolicyViolationException e, HttpServletRequest request) {
        log.warn("Archive policy violation [{}] on {}: {}", e.violation(), request.getRequestURI(), e.getMessage());
        ProblemDetail problem = problem(HttpStatus.UNPROCESSABLE_ENTITY, "Archive policy violation",
                e.getMessage(), "archive-policy-violation");
        problem.setProperty("violation", e.violation().name());
        return problem;
    }

    @ExceptionHandler(InvalidArchiveException.class)
    public ProblemDetail handleInvalidArchive(InvalidArchiveException e) {
        return problem(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Unreadable archive", e.getMessage(), "invalid-archive");
    }

    @ExceptionHandler(InvalidPayloadException.class)
    public ProblemDetail handleInvalidPayload(InvalidPayloadException e) {
        return problem(HttpStatus.BAD_REQUEST, "Malformed payload", e.getMessage(), "invalid-payload");
    }

    @ExceptionHandler({PayloadTooLargeException.class, MaxUploadSizeExceededException.class})
    public ProblemDetail handleTooLarge(Exception e) {
        return problem(HttpStatus.PAYLOAD_TOO_LARGE, "Payload too large", e.getMessage(), "payload-too-large");
    }

    private ProblemDetail problem(HttpStatus status, String title, String detail, String type) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setTitle(title);
        problem.setType(URI.create(TYPE_PREFIX + type));
        return problem;
    }
}