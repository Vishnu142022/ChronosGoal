package com.disciplineos.servlet;

import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.BufferedReader;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Shared helpers for authenticated JSON API servlets.
 * GoalServlet and TimeLogServlet use it to centralize session checks and response handling.
 */
public abstract class ApiServlet extends HttpServlet {

    /** Creates the shared API servlet helper base. */
    public ApiServlet() { }

    /**
     * Returns the active session owner, writing the established auth error when absent.
     *
     * @param request incoming API request
     * @param response response used for a missing-session error
     * @return authenticated session user id, or {@code null} after writing an error
     * @throws IOException if the error response cannot be written
     */
    protected String requireSessionUserId(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        HttpSession session = request.getSession(false);
        Object userId = session == null ? null : session.getAttribute("userId");
        if (userId == null) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Authentication required");
            return null;
        }
        return String.valueOf(userId);
    }

    /**
     * Writes a JSON value with a specific status and UTF-8 content type.
     *
     * @param response outgoing response
     * @param status HTTP status
     * @param value serializable body
     * @throws IOException if serialization or output fails
     */
    protected void sendJson(
            HttpServletResponse response,
            int status,
            Object value) throws IOException {
        ServletJson.write(response, status, value);
    }

    /**
     * Writes the standard API error shape.
     *
     * @param response outgoing response
     * @param status HTTP status
     * @param message safe client-facing message
     * @throws IOException if output fails
     */
    protected void sendError(
            HttpServletResponse response,
            int status,
            String message) throws IOException {
        sendError(response, status, message, "message");
    }

    /**
     * Writes an error while preserving legacy response keys for existing endpoints.
     *
     * @param response outgoing response
     * @param status HTTP status
     * @param message safe client-facing message
     * @param messageKey response property used by the endpoint's existing contract
     * @throws IOException if output fails
     */
    protected void sendError(
            HttpServletResponse response,
            int status,
            String message,
            String messageKey) throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("success", false);
        body.put(messageKey, message);
        sendJson(response, status, body);
    }

    /**
     * Reads the request body as UTF-8 text using the servlet container's reader.
     *
     * @param request incoming request
     * @return complete request body
     * @throws IOException if reading fails
     */
    protected String readJsonBody(HttpServletRequest request) throws IOException {
        StringBuilder body = new StringBuilder();
        try (BufferedReader reader = request.getReader()) {
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
        }
        return body.toString();
    }

    /**
     * Sets the JSON response content type without changing an endpoint's status.
     *
     * @param response outgoing response
     */
    protected void setJsonResponse(HttpServletResponse response) {
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
    }
}

