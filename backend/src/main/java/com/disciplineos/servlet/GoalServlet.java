package com.disciplineos.servlet;

import com.disciplineos.dao.GoalDAO;
import com.disciplineos.dao.GoalDAO.GoalData;
import com.disciplineos.dao.GoalStepDAO;
import com.disciplineos.dao.UsageDAO;
import com.disciplineos.service.GoalProgress;
import com.disciplineos.service.RequestValidation;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.Date;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Handles CRUD requests for goals owned by the authenticated session.
 * The React goal service calls {@code /api/goals} and {@code /api/goals/{id}}.
 */
@WebServlet("/api/goals/*")
public class GoalServlet extends ApiServlet {

    /** Repository for session-owned goal records. */
    private final GoalDAO goalDAO;
    /** Repository for supplementary usage metrics. */
    private final UsageDAO usageDAO;
    /** Repository used to include persisted milestones in each goal response. */
    private final GoalStepDAO goalStepDAO;

    /** Creates the production servlet with JDBC-backed DAOs. */
    public GoalServlet() {
        this(new GoalDAO(), new UsageDAO(), new GoalStepDAO());
    }

    GoalServlet(GoalDAO goalDAO, UsageDAO usageDAO) {
        this(goalDAO, usageDAO, new GoalStepDAO());
    }

    GoalServlet(GoalDAO goalDAO, UsageDAO usageDAO, GoalStepDAO goalStepDAO) {
        this.goalDAO = goalDAO;
        this.usageDAO = usageDAO;
        this.goalStepDAO = goalStepDAO;
    }

    // =========================================================
    // GET /api/goals
    // =========================================================

    /**
     * Handles {@code GET /api/goals} and returns the user's goals.
     *
     * @param request current authenticated request
     * @param response JSON goal list
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

        List<GoalData> goals = goalDAO.getGoalsByUser(userId);

        StringBuilder json = new StringBuilder();

        json.append("{")
                .append("\"success\":true,")
                .append("\"goals\":[");

        for (int i = 0; i < goals.size(); i++) {

            if (i > 0) {
                json.append(",");
            }

            json.append(goalToJson(goals.get(i)));
        }

        json.append("]")
                .append("}");

        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().write(json.toString());
    }

    // =========================================================
    // POST /api/goals
    // =========================================================

    /**
     * Handles {@code POST /api/goals} to create an owned goal.
     *
     * @param request JSON goal fields
     * @param response created goal or validation error
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
        GoalInput input = readGoalInput(request, response, false);
        if (input != null) createGoal(userId, input, requestStartedAt, response);
    }

    private GoalInput readGoalInput(
            HttpServletRequest request,
            HttpServletResponse response,
            boolean includeStatus) throws IOException {
        String body = readJsonBody(request);
        String name = getJsonString(body, "name");
        String category = getJsonString(body, "category");
        String targetValue = getJsonValue(body, "targetHours");
        String deadlineValue = getJsonString(body, "deadline");
        String startDateValue = getJsonString(body, "startDate");
        String priority = getJsonString(body, "priority");
        String status = includeStatus ? getJsonString(body, "status") : "NOT_STARTED";
        String description = getJsonString(body, "description");
        if (isEmpty(name) || isEmpty(category) || isEmpty(targetValue)
                || isEmpty(deadlineValue) || isEmpty(startDateValue)) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Name, category, targetHours, deadline and startDate are required");
            return null;
        }
        try {
            double targetHours = Double.parseDouble(targetValue);
            if (includeStatus && targetHours <= 0) {
                sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                        "Target hours must be greater than 0");
                return null;
            }
            Date deadline = Date.valueOf(deadlineValue);
            Date startDate = Date.valueOf(startDateValue);
            String error = RequestValidation.goalError(name, BigDecimal.valueOf(targetHours),
                    startDate.toLocalDate(), deadline.toLocalDate());
            if (error != null) {
                sendError(response, HttpServletResponse.SC_BAD_REQUEST, error);
                return null;
            }
            return new GoalInput(name.trim(), category.trim(), targetHours, deadline, startDate,
                    isEmpty(priority) ? "MEDIUM" : priority.trim().toUpperCase(),
                    isEmpty(status) ? "NOT_STARTED" : status.trim().toUpperCase(), description);
        } catch (NumberFormatException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Target hours must be a valid number");
        } catch (IllegalArgumentException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Invalid date format. Use YYYY-MM-DD");
        }
        return null;
    }

    private void createGoal(
            String userId, GoalInput input, long requestStartedAt,
            HttpServletResponse response) throws IOException {
        String id = goalDAO.createGoal(userId, input.name(), input.category(),
                input.targetHours(), input.deadline(), input.startDate(),
                input.priority(), input.description());
        if (id == null) {
            sendError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Unable to create goal");
            return;
        }
        usageDAO.recordEvent(userId, "GOALS", "CREATE_GOAL", requestStartedAt);
        GoalData created = goalDAO.getGoalById(id, userId);
        if (created == null) {
            sendJson(response, HttpServletResponse.SC_CREATED,
                    Map.of("success", true, "message", "Goal created successfully"));
            return;
        }
        response.setStatus(HttpServletResponse.SC_CREATED);
        response.getWriter().write(goalToJson(created));
    }

    // =========================================================
    // PUT /api/goals/{id}
    // =========================================================

    /**
     * Handles {@code PUT /api/goals/{id}} to update an owned goal.
     *
     * @param request path id and JSON goal fields
     * @param response updated goal or error
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
        String goalId = getGoalId(request);
        if (isEmpty(goalId)) {
            sendError(response, 400, "Goal id is required");
            return;
        }
        GoalInput input = readGoalInput(request, response, true);
        if (input != null) updateGoal(userId, goalId, input, requestStartedAt, response);
    }

    private void updateGoal(
            String userId, String goalId, GoalInput input, long requestStartedAt,
            HttpServletResponse response) throws IOException {
        boolean updated = goalDAO.updateGoal(goalId, userId, input.name(), input.category(),
                input.targetHours(), input.deadline(), input.startDate(), input.priority(),
                input.status(), input.description());
        if (!updated) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Goal not found");
            return;
        }
        usageDAO.recordEvent(userId, "GOALS", "UPDATE_GOAL", requestStartedAt);
        GoalData updatedGoal = goalDAO.getGoalById(goalId, userId);
        if (updatedGoal == null) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Goal not found");
            return;
        }
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().write(goalToJson(updatedGoal));
    }

    // =========================================================
    // DELETE /api/goals/{id}
    // =========================================================

    /**
     * Handles {@code DELETE /api/goals/{id}} for an owned goal.
     *
     * @param request path id and current session
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

        String goalId = getGoalId(request);

        if (isEmpty(goalId)) {
            sendError(
                    response,
                    400,
                    "Goal id is required"
            );
            return;
        }

        boolean deleted = goalDAO.deleteGoal(
                goalId,
                userId
        );

        if (!deleted) {
            sendError(
                    response,
                    404,
                    "Goal not found"
            );
            return;
        }
        usageDAO.recordEvent(userId, "GOALS", "DELETE_GOAL", requestStartedAt);

        response.setStatus(HttpServletResponse.SC_OK);

        response.getWriter().write(
                "{\"success\":true,\"message\":\"Goal deleted successfully\"}"
        );
    }

    // =========================================================
    // Get /api/goals/{id}
    // =========================================================

    private String getGoalId(
            HttpServletRequest request) {

        String pathInfo =
                request.getPathInfo();

        if (pathInfo == null
                || pathInfo.equals("/")
                || pathInfo.trim().isEmpty()) {

            return null;
        }

        String goalId =
                pathInfo.substring(1);

        if (goalId.contains("/")) {
            goalId =
                    goalId.substring(
                            0,
                            goalId.indexOf("/")
                    );
        }

        return goalId;
    }

    // =========================================================
    // JSON response
    // =========================================================

    private String goalToJson(
            GoalData goal) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("id", goal.getId());
        json.put("userId", goal.getUserId());
        json.put("name", goal.getName());
        json.put("category", goal.getCategory());
        json.put("targetHours", goal.getTargetHours());
        json.put("deadline", String.valueOf(goal.getDeadline()));
        json.put("startDate", String.valueOf(goal.getStartDate()));
        json.put("priority", goal.getPriority());
        // Display status mirrors the SQL progress triggers after time-log mutations.
        json.put("status", GoalProgress.statusAfterLog(goal.getStatus(),
                goal.getTotalLoggedMinutes(), BigDecimal.valueOf(goal.getTargetHours())));
        json.put("description", goal.getDescription() == null ? "" : goal.getDescription());
        json.put("totalLoggedMinutes", goal.getTotalLoggedMinutes());
        json.put("progressPercent", GoalProgress.percentComplete(
                goal.getTotalLoggedMinutes(), BigDecimal.valueOf(goal.getTargetHours())));
        json.put("steps", stepResponses(goalStepDAO.getStepsByGoalId(goal.getId())));
        return ServletJson.stringify(json);
    }

    private List<Map<String, Object>> stepResponses(List<GoalStepDAO.StepData> steps) {
        List<Map<String, Object>> responses = new ArrayList<>();
        for (GoalStepDAO.StepData step : steps) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", step.getId());
            response.put("goalId", step.getGoalId());
            response.put("title", step.getTitle());
            response.put("deadline",
                    step.getDeadline() == null ? null : step.getDeadline().toString());
            response.put("completed", step.isCompleted());
            response.put("completedAt",
                    step.getCompletedAt() == null ? null : step.getCompletedAt().toString());
            response.put("stepOrder", step.getStepOrder());
            responses.add(response);
        }
        return responses;
    }

    // =========================================================
    // Simple JSON string extraction
    // =========================================================

    private String getJsonString(
            String json,
            String key) {

        if (json == null || json.isEmpty()) {
            return null;
        }

        String pattern =
                "\"" + key + "\"\\s*:\\s*\"";

        java.util.regex.Pattern compiledPattern =
                java.util.regex.Pattern.compile(
                        pattern
                );

        java.util.regex.Matcher matcher =
                compiledPattern.matcher(json);

        if (!matcher.find()) {
            return null;
        }

        int start =
                matcher.end();

        StringBuilder value =
                new StringBuilder();

        boolean escaped = false;

        for (int i = start; i < json.length(); i++) {

            char c = json.charAt(i);

            if (escaped) {

                switch (c) {

                    case '"':
                        value.append('"');
                        break;

                    case '\\':
                        value.append('\\');
                        break;

                    case 'n':
                        value.append('\n');
                        break;

                    case 'r':
                        value.append('\r');
                        break;

                    case 't':
                        value.append('\t');
                        break;

                    default:
                        value.append(c);
                        break;
                }

                escaped = false;

            } else if (c == '\\') {

                escaped = true;

            } else if (c == '"') {

                break;

            } else {

                value.append(c);
            }
        }

        return value.toString();
    }

    // =========================================================
    // Simple JSON number / boolean / raw value extraction
    // =========================================================

    private String getJsonValue(
            String json,
            String key) {

        if (json == null || json.isEmpty()) {
            return null;
        }

        String pattern =
                "\"" + key + "\"\\s*:\\s*([^,}\\s]+)";

        java.util.regex.Pattern compiledPattern =
                java.util.regex.Pattern.compile(
                        pattern
                );

        java.util.regex.Matcher matcher =
                compiledPattern.matcher(json);

        if (!matcher.find()) {
            return null;
        }

        String value =
                matcher.group(1).trim();

        if ("null".equals(value)) {
            return null;
        }

        return value;
    }

    // =========================================================
    // Utility
    // =========================================================

    private boolean isEmpty(
            String value) {

        return value == null
                || value.trim().isEmpty();
    }

    private record GoalInput(
            String name,
            String category,
            double targetHours,
            Date deadline,
            Date startDate,
            String priority,
            String status,
            String description) {
    }

}
