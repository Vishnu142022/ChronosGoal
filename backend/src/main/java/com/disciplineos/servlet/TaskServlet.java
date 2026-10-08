package com.disciplineos.servlet;

import com.disciplineos.dao.TaskDAO;
import com.disciplineos.dao.TaskDAO.TaskData;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Session-scoped task CRUD API used by the task planner.
 * Ownership is taken exclusively from the authenticated HTTP session.
 */
@WebServlet("/api/tasks/*")
public class TaskServlet extends ApiServlet {

    /** Repository for session-owned task operations. */
    private final TaskDAO taskDAO;

    /** Constructs the production servlet with its JDBC-backed DAO. */
    public TaskServlet() {
        this(new TaskDAO());
    }

    TaskServlet(TaskDAO taskDAO) {
        this.taskDAO = taskDAO;
    }

    /**
     * Handles {@code GET /api/tasks} and returns the current user's tasks.
     *
     * @param request authenticated request
     * @param response JSON task array
     * @throws ServletException if servlet processing fails
     * @throws IOException if the response cannot be written
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        List<Map<String, Object>> tasks = taskDAO.list(userId).stream().map(this::toJson).toList();
        sendJson(response, HttpServletResponse.SC_OK, tasks);
    }

    /**
     * Handles {@code POST /api/tasks} to create a task, or
     * {@code POST /api/tasks/{id}/toggle} to change completion.
     *
     * @param request authenticated request and JSON task fields
     * @param response created or updated task, or an error
     * @throws ServletException if servlet processing fails
     * @throws IOException if request reading or response writing fails
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        String id = pathId(request);
        if (id != null && "toggle".equals(pathSuffix(request))) {
            TaskData updated = taskDAO.toggle(userId, id);
            if (updated == null) {
                sendError(response, HttpServletResponse.SC_NOT_FOUND, "Task not found");
                return;
            }
            sendJson(response, HttpServletResponse.SC_OK, toJson(updated));
            return;
        }
        try {
            Map<String, Object> body = readBody(request);
            TaskData created = taskDAO.create(userId, stringBody(body, "title"),
                    optionalStringBody(body, "description"), priority(body),
                    optionalStringBody(body, "category", "General"), dateBody(body, "dueDate"));
            sendJson(response, HttpServletResponse.SC_CREATED, toJson(created));
        } catch (IllegalArgumentException | JsonProcessingException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, exception.getMessage());
        }
    }

    /**
     * Handles {@code PUT /api/tasks/{id}} to update editable task fields.
     *
     * @param request authenticated request and JSON task fields
     * @param response updated task, or an error
     * @throws ServletException if servlet processing fails
     * @throws IOException if request reading or response writing fails
     */
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        try {
            Map<String, Object> body = readBody(request);
            TaskData updated = taskDAO.update(userId, pathId(request), stringBody(body, "title"),
                    optionalStringBody(body, "description"), priority(body),
                    optionalStringBody(body, "category", "General"), dateBody(body, "dueDate"));
            if (updated == null) {
                sendError(response, HttpServletResponse.SC_NOT_FOUND, "Task not found");
                return;
            }
            sendJson(response, HttpServletResponse.SC_OK, toJson(updated));
        } catch (IllegalArgumentException | JsonProcessingException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, exception.getMessage());
        }
    }

    /**
     * Handles {@code DELETE /api/tasks/{id}} for a task owned by the session user.
     *
     * @param request authenticated request
     * @param response deletion confirmation, or an error
     * @throws ServletException if servlet processing fails
     * @throws IOException if the response cannot be written
     */
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        boolean deleted = taskDAO.delete(userId, pathId(request));
        if (!deleted) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Task not found");
            return;
        }
        sendJson(response, HttpServletResponse.SC_OK, Map.of("success", true));
    }

    private Map<String, Object> readBody(HttpServletRequest request) throws IOException {
        try {
            return ServletJson.readObject(readJsonBody(request));
        } catch (JsonProcessingException exception) {
            throw exception;
        }
    }

    private String stringBody(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (!(value instanceof String text) || text.isBlank()) {
            throw new IllegalArgumentException(key + " is required");
        }
        String trimmed = text.trim();
        if ("title".equals(key) && trimmed.length() > 200) {
            throw new IllegalArgumentException("title must be 200 characters or fewer");
        }
        return trimmed;
    }

    private String optionalStringBody(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value instanceof String text && !text.isBlank() ? text.trim() : null;
    }

    private String optionalStringBody(Map<String, Object> body, String key, String fallback) {
        String value = optionalStringBody(body, key);
        return value == null ? fallback : value;
    }

    private String priority(Map<String, Object> body) {
        String value = optionalStringBody(body, "priority", "MEDIUM").toUpperCase();
        if (!List.of("LOW", "MEDIUM", "HIGH", "URGENT").contains(value)) {
            throw new IllegalArgumentException("priority is invalid");
        }
        return value;
    }

    private Date dateBody(Map<String, Object> body, String key) {
        String value = optionalStringBody(body, key);
        return value == null ? null : Date.valueOf(value);
    }

    private String pathId(HttpServletRequest request) {
        String path = request.getPathInfo();
        if (path == null || path.equals("/")) return null;
        String[] parts = path.split("/");
        return parts.length > 1 ? parts[1] : null;
    }

    private String pathSuffix(HttpServletRequest request) {
        String path = request.getPathInfo();
        if (path == null) return "";
        String[] parts = path.split("/");
        return parts.length > 2 ? parts[2] : "";
    }

    private Map<String, Object> toJson(TaskData task) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("id", task.id());
        json.put("userId", task.userId());
        json.put("title", task.title());
        json.put("description", task.description());
        json.put("priority", task.priority());
        json.put("category", task.category());
        json.put("dueDate", task.dueDate() == null ? null : task.dueDate().toString());
        json.put("completed", task.completed());
        json.put("completedAt", task.completedAt() == null ? null : task.completedAt().toString());
        json.put("createdAt", task.createdAt() == null ? null : task.createdAt().toString());
        return json;
    }
}

