package com.disciplineos.servlet;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

/**
 * Shared Jackson helpers for servlet request and response JSON.
 * Package-local servlet code uses one mapper to keep API serialization consistent.
 */
final class ServletJson {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ServletJson() {
    }

    /**
     * Parses a JSON object into its string-keyed request map.
     *
     * @param json request body text
     * @return parsed JSON object
     * @throws JsonProcessingException if the body is malformed or not an object
     */
    static Map<String, Object> readObject(String json)
            throws JsonProcessingException {
        return MAPPER.readValue(json,
                MAPPER.getTypeFactory().constructMapType(Map.class, String.class, Object.class));
    }

    /**
     * Serializes a value using the servlet JSON mapper.
     *
     * @param value value to serialize
     * @return JSON representation
     */
    static String stringify(Object value) {
        try {
            return MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("Unable to serialize JSON response", exception);
        }
    }

    /**
     * Writes a serialized response body and status.
     *
     * @param response target servlet response
     * @param status HTTP status code
     * @param value value to serialize
     * @throws IOException if writing the response fails
     */
    static void write(
            HttpServletResponse response,
            int status,
            Object value) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        MAPPER.writeValue(response.getWriter(), value);
    }

    /**
     * Writes the standard API error response.
     *
     * @param response target servlet response
     * @param status HTTP status code
     * @param message client-facing error message
     * @throws IOException if writing the response fails
     */
    static void error(HttpServletResponse response, int status, String message)
            throws IOException {
        write(response, status, Map.of("success", false, "message", message));
    }
}

