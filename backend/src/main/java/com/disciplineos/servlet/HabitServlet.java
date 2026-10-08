package com.disciplineos.servlet;

import com.disciplineos.dao.HabitDAO;
import com.disciplineos.dao.HabitDAO.HabitData;
import com.disciplineos.dao.HabitDAO.HabitInput;
import com.disciplineos.service.HabitProgress;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.sql.Date;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Session-scoped habit CRUD and date-log API used by the habit matrix.
 * User identity always comes from the session, never the request body or query string.
 */
@WebServlet("/api/habits/*")
public class HabitServlet extends ApiServlet {

    /** Repository for session-owned habits and completion history. */
    private final HabitDAO habitDAO;

    /** Constructs the production servlet with its JDBC-backed DAO. */
    public HabitServlet() {
        this(new HabitDAO());
    }

    HabitServlet(HabitDAO habitDAO) {
        this.habitDAO = habitDAO;
    }

    /**
     * Handles {@code GET /api/habits} and returns the current user's habits.
     *
     * @param request authenticated request
     * @param response JSON habit array
     * @throws ServletException if servlet processing fails
     * @throws IOException if the response cannot be written
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        sendJson(response, HttpServletResponse.SC_OK,
                habitDAO.list(userId).stream().map(this::toJson).toList());
    }

    /**
     * Handles {@code POST /api/habits}, {@code POST /api/habits/{id}/toggle},
     * and {@code POST /api/habits/{id}/freeze}.
     *
     * @param request authenticated request and optional JSON data
     * @param response created/updated habit, or an error
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
        String suffix = pathSuffix(request);
        try {
            if (id != null && "toggle".equals(suffix)) {
                Map<String, Object> body = readBody(request);
                Object dateValue = body.get("date");
                if (!(dateValue instanceof String date) || date.isBlank()) {
                    sendError(response, HttpServletResponse.SC_BAD_REQUEST, "date is required");
                    return;
                }
                HabitData habit = habitDAO.toggle(userId, id, Date.valueOf(date));
                respondHabit(response, habit);
                return;
            }
            if (id != null && "freeze".equals(suffix)) {
                HabitData habit = habitDAO.freeze(userId, id, Date.valueOf(LocalDate.now()));
                respondHabit(response, habit);
                return;
            }
            HabitData created = habitDAO.create(userId, input(readBody(request)));
            sendJson(response, HttpServletResponse.SC_CREATED, toJson(created));
        } catch (IllegalArgumentException | JsonProcessingException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, exception.getMessage());
        }
    }

    /**
     * Handles {@code PUT /api/habits/{id}} to replace habit fields and date history atomically.
     *
     * @param request authenticated request and JSON habit fields
     * @param response updated habit, or an error
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
            HabitData updated = habitDAO.update(userId, pathId(request), input(readBody(request)));
            respondHabit(response, updated);
        } catch (IllegalArgumentException | JsonProcessingException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST, exception.getMessage());
        }
    }

    /**
     * Handles {@code DELETE /api/habits/{id}} for a habit owned by the session user.
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
        if (!habitDAO.delete(userId, pathId(request))) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Habit not found");
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

    private HabitInput input(Map<String, Object> body) {
        String name = required(body, "name");
        if (name.length() > 160) throw new IllegalArgumentException("name must be 160 characters or fewer");
        String frequency = optional(body, "frequency", "DAILY").toUpperCase();
        if (!List.of("DAILY", "WEEKDAYS", "WEEKENDS", "CUSTOM", "WEEKLY", "MONTHLY")
                .contains(frequency)) {
            throw new IllegalArgumentException("frequency is invalid");
        }
        return new HabitInput(name, optionalNullable(body, "description"),
                optional(body, "category", "General"), optional(body, "categoryColor", "#A855F7"),
                frequency, optionalNullable(body, "timeOfDay"), optionalNullable(body, "reminder"),
                parseDate(optionalNullable(body, "startDate")),
                integer(body, "weeklyTarget"), integer(body, "monthlyTarget"),
                optionalNullable(body, "monthlyUnit"), history(body.get("history")));
    }

    private String required(Map<String, Object> body, String key) {
        String value = optionalNullable(body, key);
        if (value == null) throw new IllegalArgumentException(key + " is required");
        return value;
    }

    private String optional(Map<String, Object> body, String key, String fallback) {
        String value = optionalNullable(body, key);
        return value == null ? fallback : value;
    }

    private String optionalNullable(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value instanceof String text && !text.isBlank() ? text.trim() : null;
    }

    private Integer integer(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (value == null) return null;
        if (!(value instanceof Number number) || number.intValue() < 1) {
            throw new IllegalArgumentException(key + " must be a positive integer");
        }
        return number.intValue();
    }

    private Date parseDate(String value) {
        return value == null ? null : Date.valueOf(value);
    }

    private Map<String, String> history(Object value) {
        if (value == null) return Map.of();
        if (!(value instanceof Map<?, ?> values)) {
            throw new IllegalArgumentException("history must be an object");
        }
        Map<String, String> result = new LinkedHashMap<>();
        values.forEach((date, status) -> {
            if (!(date instanceof String dateText)) {
                throw new IllegalArgumentException("history date is invalid");
            }
            LocalDate.parse(dateText);
            String normalized = Boolean.TRUE.equals(status) ? "COMPLETED"
                    : status instanceof String text ? text : "";
            if (Boolean.FALSE.equals(status) || status == null) return;
            if (!List.of("COMPLETED", "FROZEN", "MISSED").contains(normalized)) {
                throw new IllegalArgumentException("history status is invalid");
            }
            result.put(dateText, normalized);
        });
        return result;
    }

    private void respondHabit(HttpServletResponse response, HabitData habit) throws IOException {
        if (habit == null) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Habit not found");
            return;
        }
        sendJson(response, HttpServletResponse.SC_OK, toJson(habit));
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

    private Map<String, Object> toJson(HabitData habit) {
        LocalDate today = LocalDate.now();
        String todayKey = today.toString();
        String todayStatus = habit.history().get(todayKey);
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("id", habit.id());
        json.put("userId", habit.userId());
        json.put("name", habit.name());
        json.put("description", habit.description());
        json.put("category", habit.category());
        json.put("categoryColor", habit.categoryColor());
        json.put("frequency", habit.frequency());
        json.put("timeOfDay", habit.timeOfDay());
        json.put("reminder", habit.reminder());
        json.put("startDate", habit.startDate() == null ? null : habit.startDate().toString());
        json.put("weeklyTarget", habit.weeklyTarget());
        json.put("monthlyTarget", habit.monthlyTarget());
        json.put("monthlyUnit", habit.monthlyUnit());
        json.put("history", habit.history());
        json.put("completedToday", "COMPLETED".equals(todayStatus));
        json.put("isFrozenToday", "FROZEN".equals(todayStatus));
        json.put("streak", HabitProgress.currentStreak(habit.history(), today));
        json.put("bestStreak", HabitProgress.bestStreak(habit.history()));
        json.put("createdAt", habit.createdAt() == null ? null : habit.createdAt().toString());
        return json;
    }
}

