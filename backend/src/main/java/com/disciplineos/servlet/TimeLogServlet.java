package com.disciplineos.servlet;

import com.disciplineos.dao.TimeLogDAO;
import com.disciplineos.dao.UsageDAO;
import com.disciplineos.service.TimeLogDuration;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;

/**
 * Handles authenticated time-log CRUD while deriving ownership from the session.
 * The frontend uses {@code /api/time-logs} and associates each entry with an owned goal.
 */
@WebServlet("/api/time-logs")
public class TimeLogServlet extends ApiServlet {

    /** Repository for session-owned time-log operations. */
    private final TimeLogDAO timeLogDAO;
    /** Repository for supplementary time-log usage metrics. */
    private final UsageDAO usageDAO;

    /** Constructs the production servlet with JDBC-backed DAOs. */
    public TimeLogServlet() {
        this(new TimeLogDAO(), new UsageDAO());
    }

    TimeLogServlet(TimeLogDAO timeLogDAO, UsageDAO usageDAO) {
        this.timeLogDAO = timeLogDAO;
        this.usageDAO = usageDAO;
    }

    // =========================
    // CREATE TIME LOG
    // =========================
    /**
     * Handles {@code POST /api/time-logs} to record a work session.
     *
     * @param request form-encoded time-log fields and active session
     * @param response created log or validation error
     * @throws ServletException when servlet processing fails
     * @throws IOException when reading or writing the request fails
     */
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {
        long requestStartedAt = System.nanoTime();
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        TimeLogInput input = readFormInput(request, response);
        if (input != null) createTimeLog(userId, input, requestStartedAt, response);
    }

    private TimeLogInput readFormInput(
            HttpServletRequest request, HttpServletResponse response) throws IOException {
        String logDate = request.getParameter("logDate");
        String goalId = request.getParameter("goalId");
        String startTime = request.getParameter("startTime");
        String endTime = request.getParameter("endTime");
        String duration = request.getParameter("durationMinutes");
        String notes = request.getParameter("notes");
        String rating = request.getParameter("productivityRating");
        if (isBlank(goalId) || isBlank(logDate) || isBlank(startTime)
                || isBlank(endTime) || isBlank(duration)) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "goalId, logDate, startTime, endTime and durationMinutes are required");
            return null;
        }
        return validateInput(goalId, logDate, startTime, endTime, duration, notes, rating, response);
    }

    private TimeLogInput validateInput(
            String goalId, String logDate, String startTime, String endTime,
            String duration, String notes, String rating, HttpServletResponse response)
            throws IOException {
        int minutes;
        try {
            minutes = TimeLogDuration.calculate(startTime, endTime, duration);
        } catch (IllegalArgumentException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, exception.getMessage());
            return null;
        }
        Integer ratingValue = parseRating(rating, response);
        if (rating != null && !rating.isBlank() && ratingValue == null) return null;
        try {
            return new TimeLogInput(goalId, Date.valueOf(logDate), startTime, endTime,
                    minutes, notes, ratingValue);
        } catch (IllegalArgumentException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "logDate must use YYYY-MM-DD format");
            return null;
        }
    }

    private Integer parseRating(String rating, HttpServletResponse response) throws IOException {
        if (rating == null || rating.isBlank()) return null;
        try {
            int value = Integer.parseInt(rating);
            if (value < 1 || value > 5) {
                sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                        "productivityRating must be between 1 and 5");
                return null;
            }
            return value;
        } catch (NumberFormatException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "productivityRating must be a number");
            return null;
        }
    }

    private void createTimeLog(
            String userId, TimeLogInput input, long requestStartedAt,
            HttpServletResponse response) throws IOException {
        TimeLogDAO.TimeLogData created = timeLogDAO.createTimeLog(userId, input.goalId(),
                input.logDate(), input.startTime(), input.endTime(), input.durationMinutes(),
                input.notes(), input.productivityRating());
        if (created == null) {
            sendError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Unable to create time log");
            return;
        }
        usageDAO.recordEvent(userId, "TIME_TRACKING", "CREATE_TIME_LOG", requestStartedAt);
        response.setStatus(HttpServletResponse.SC_CREATED);
        writeTimeLogResponse(response, created);
    }

    // =========================
    // GET TIME LOGS
    // =========================
    /**
     * Handles {@code GET /api/time-logs}, optionally filtered by goal id.
     *
     * @param request optional goal query and active session
     * @param response JSON time-log list
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        setJsonResponse(response);

        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }

        String goalId = request.getParameter("goalId");

        List<TimeLogDAO.TimeLogData> logs;

        if (goalId != null && !goalId.isBlank()) {

            logs = timeLogDAO.getTimeLogsByGoal(
                    goalId,
                    userId
            );

        } else {

            logs = timeLogDAO.getTimeLogsByUser(
                    userId
            );
        }
        writeTimeLogsResponse(response, logs);
    }

    private void writeTimeLogsResponse(
            HttpServletResponse response, List<TimeLogDAO.TimeLogData> logs) throws IOException {
        StringBuilder json =
                new StringBuilder();

        json.append("{\"success\":true,\"data\":[");

        for (int i = 0; i < logs.size(); i++) {

            if (i > 0) {
                json.append(",");
            }

            appendTimeLogJson(
                    json,
                    logs.get(i)
            );
        }

        json.append("]}");

        response.getWriter().write(
                json.toString()
        );
    }


    // =========================
    // UPDATE TIME LOG
    // =========================
    /**
     * Handles {@code PUT /api/time-logs?id={id}} with a JSON update body.
     *
     * @param request log id query, JSON fields, and active session
     * @param response updated log or validation error
     * @throws ServletException when servlet processing fails
     * @throws IOException when reading or writing the request fails
     */
    @Override
    protected void doPut(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {
        long requestStartedAt = System.nanoTime();
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        String logId = request.getParameter("id");
        if (isBlank(logId)) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, "id is required");
            return;
        }
        TimeLogInput input = readJsonInput(request, response);
        if (input != null) updateTimeLog(userId, logId, input, requestStartedAt, response);
    }

    private TimeLogInput readJsonInput(
            HttpServletRequest request, HttpServletResponse response) throws IOException {
        Map<String, Object> payload;
        try {
            payload = ServletJson.readObject(readJsonBody(request));
        } catch (JsonProcessingException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Request body must be a valid JSON object");
            return null;
        }
        String goalId = requestValue(payload, "goalId");
        String logDate = requestValue(payload, "logDate");
        String startTime = requestValue(payload, "startTime");
        String endTime = requestValue(payload, "endTime");
        String duration = requestValue(payload, "durationMinutes");
        String notes = requestValue(payload, "notes");
        String rating = requestValue(payload, "productivityRating");
        if (isBlank(goalId) || isBlank(logDate) || isBlank(startTime)
                || isBlank(endTime) || isBlank(duration)) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "goalId, logDate, startTime, endTime and durationMinutes are required");
            return null;
        }
        return validateInput(goalId, logDate, startTime, endTime, duration, notes, rating, response);
    }

    private void updateTimeLog(
            String userId, String logId, TimeLogInput input, long requestStartedAt,
            HttpServletResponse response) throws IOException {
        boolean updated = timeLogDAO.updateTimeLog(logId, userId, input.goalId(),
                input.logDate(), input.startTime(), input.endTime(), input.durationMinutes(),
                input.notes(), input.productivityRating());
        if (!updated) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Time log not found");
            return;
        }
        usageDAO.recordEvent(userId, "TIME_TRACKING", "UPDATE_TIME_LOG", requestStartedAt);
        TimeLogDAO.TimeLogData updatedLog = timeLogDAO.getTimeLogById(logId, userId);
        if (updatedLog == null) {
            sendError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Time log updated but could not be retrieved");
            return;
        }
        writeTimeLogResponse(response, updatedLog);
    }


    // =========================
    // DELETE TIME LOG
    // =========================
    /**
     * Handles {@code DELETE /api/time-logs?id={id}} for an owned log.
     *
     * @param request log id query and active session
     * @param response JSON deletion result
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doDelete(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        long requestStartedAt = System.nanoTime();
        setJsonResponse(response);

        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }

        String logId =
                request.getParameter("id");

        if (logId == null || logId.isBlank()) {

            sendError(
                    response,
                    400,
                    "id is required"
            );
            return;
        }

        boolean deleted =
                timeLogDAO.deleteTimeLog(
                        logId,
                        userId
                );

        if (!deleted) {

            sendError(
                    response,
                    404,
                    "Time log not found"
            );
            return;
        }
        usageDAO.recordEvent(userId, "TIME_TRACKING", "DELETE_TIME_LOG", requestStartedAt);

        response.getWriter().write(
                "{\"success\":true,\"message\":\"Time log deleted successfully\"}"
        );
    }


    // =========================
    // JSON RESPONSE
    // =========================
    private void writeTimeLogResponse(
            HttpServletResponse response,
            TimeLogDAO.TimeLogData log)
            throws IOException {

        StringBuilder json =
                new StringBuilder();

        json.append("{\"success\":true,\"data\":");

        appendTimeLogJson(
                json,
                log
        );

        json.append("}");

        response.getWriter().write(
                json.toString()
        );
    }


    private void appendTimeLogJson(
            StringBuilder json,
            TimeLogDAO.TimeLogData log) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", log.getId());
        value.put("userId", log.getUserId());
        value.put("goalId", log.getGoalId());
        value.put("goalName", log.getGoalName());
        value.put("logDate", String.valueOf(log.getLogDate()));
        value.put("startTime", log.getStartTime());
        value.put("endTime", log.getEndTime());
        value.put("durationMinutes", log.getDurationMinutes());
        value.put("notes", log.getNotes());
        value.put("productivityRating", log.getProductivityRating());
        value.put("createdAt", log.getCreatedAt() == null ? null : log.getCreatedAt().toString());
        json.append(ServletJson.stringify(value));
    }

    // =========================
    // COMMON HELPERS
    // =========================
    /**
     * Preserves the existing time-log error key while using shared JSON serialization.
     *
     * @param response outgoing error response
     * @param status HTTP status
     * @param message client-facing error
     * @throws IOException if writing fails
     */
    @Override
    protected void sendError(
            HttpServletResponse response,
            int status,
            String message)
            throws IOException {
        super.sendError(response, status, message, "error");
    }

    private String requestValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value == null ? null : String.valueOf(value);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record TimeLogInput(
            String goalId,
            Date logDate,
            String startTime,
            String endTime,
            int durationMinutes,
            String notes,
            Integer productivityRating) {
    }
}
