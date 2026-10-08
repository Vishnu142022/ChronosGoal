package com.disciplineos.servlet;

import com.disciplineos.dao.AdminDAO;
import com.disciplineos.service.AdminDashboardReportService;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.mindrot.jbcrypt.BCrypt;

import java.io.IOException;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.util.Map;
import java.util.Set;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Exposes administrator-only account, parameter, usage, and audit operations.
 * The frontend calls {@code /api/admin/*}; servlet role checks remain defense in depth
 * behind the API authentication filter.
 */
@WebServlet("/api/admin/*")
public class AdminServlet extends ApiServlet {

    private static final Logger LOGGER = Logger.getLogger(AdminServlet.class.getName());
    private static final Set<String> METRIC_TYPES =
            Set.of("HOURS", "SESSIONS", "MILESTONES", "PAGES_OR_UNITS");

    /** Repository for administrator account, parameter, usage, and audit operations. */
    private final AdminDAO adminDAO;
    /** Bounded asynchronous service that assembles dashboard reports. */
    private final AdminDashboardReportService reportService;

    /** Creates the production servlet and its bounded report service. */
    public AdminServlet() {
        this(new AdminDAO(), new AdminDashboardReportService());
    }

    AdminServlet(AdminDAO adminDAO, AdminDashboardReportService reportService) {
        this.adminDAO = adminDAO;
        this.reportService = reportService;
    }

    /** Stops the report executor when the servlet context shuts down. */
    @Override
    public void destroy() {
        reportService.close();
    }

    /**
     * Handles {@code GET /api/admin/*}.
     *
     * @param request administrator session and route
     * @param response JSON report or error
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        dispatch("GET", request, response);
    }

    /**
     * Handles {@code POST /api/admin/*}.
     *
     * @param request administrator session, route, and JSON body
     * @param response JSON mutation result or error
     * @throws ServletException when servlet processing fails
     * @throws IOException when reading or writing the request fails
     */
    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        dispatch("POST", request, response);
    }

    /**
     * Handles {@code PUT /api/admin/*}.
     *
     * @param request administrator session, route, and JSON body
     * @param response JSON mutation result or error
     * @throws ServletException when servlet processing fails
     * @throws IOException when reading or writing the request fails
     */
    @Override
    protected void doPut(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        dispatch("PUT", request, response);
    }

    /**
     * Handles {@code DELETE /api/admin/*}.
     *
     * @param request administrator session and route
     * @param response JSON mutation result or error
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doDelete(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        dispatch("DELETE", request, response);
    }

    private void dispatch(
            String method,
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {
        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }
        if (!"ADMIN".equals(request.getSession(false).getAttribute("userRole"))) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN,
                    "Administrator permission required");
            return;
        }

        String path = request.getPathInfo();
        String[] parts = path == null ? new String[0] : path.substring(1).split("/");

        try {
            if ("GET".equals(method)) {
                get(response, parts);
            } else if ("POST".equals(method)) {
                post(request, response, parts, userId);
            } else if ("PUT".equals(method)) {
                put(request, response, parts, userId);
            } else if ("DELETE".equals(method)) {
                delete(request, response, parts, userId);
            } else {
                sendError(response, HttpServletResponse.SC_METHOD_NOT_ALLOWED,
                        "Method not allowed");
            }
        } catch (IllegalArgumentException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    exception.getMessage());
        } catch (IllegalStateException exception) {
            sendError(response, HttpServletResponse.SC_CONFLICT,
                    exception.getMessage());
        } catch (SQLException exception) {
            LOGGER.log(Level.SEVERE, "Admin database operation failed", exception);
            int status = "23000".equals(exception.getSQLState())
                    ? HttpServletResponse.SC_CONFLICT
                    : exception.getMessage() != null
                            && exception.getMessage().contains("not found")
                            ? HttpServletResponse.SC_NOT_FOUND
                            : HttpServletResponse.SC_INTERNAL_SERVER_ERROR;
            sendError(response, status,
                    status == HttpServletResponse.SC_INTERNAL_SERVER_ERROR
                            ? "Administrator operation failed"
                            : exception.getMessage());
        }
    }

    private void get(HttpServletResponse response, String[] path)
            throws SQLException, IOException {
        if (path.length == 1 && "dashboard".equals(path[0])) {
            sendJson(response, HttpServletResponse.SC_OK,
                    reportService.createReport());
        } else if (path.length == 1 && "stats".equals(path[0])) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "stats", adminDAO.getStats()));
        } else if (path.length == 1 && "users".equals(path[0])) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "users", adminDAO.getUsers()));
        } else if (path.length == 1 && "goals".equals(path[0])) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "parameters", adminDAO.getGoalParameters()));
        } else if (path.length == 1 && "usage".equals(path[0])) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "usage", adminDAO.getUsage()));
        } else if (path.length == 1 && "audit".equals(path[0])) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "logs", adminDAO.getAuditLogs()));
        } else {
            sendError(response, HttpServletResponse.SC_NOT_FOUND,
                    "Administrator endpoint not found");
        }
    }

    private void post(
            HttpServletRequest request,
            HttpServletResponse response,
            String[] path,
            String adminId) throws SQLException, IOException {
        if (path.length == 1 && "goals".equals(path[0])) {
            Map<String, Object> body = readBody(request);
            validateParameter(body);
            String id = adminDAO.saveGoalParameter(null, body, adminId, request.getRemoteAddr());
            sendJson(response, HttpServletResponse.SC_CREATED,
                    Map.of("success", true, "id", id));
            return;
        }
        if (path.length == 3 && "users".equals(path[0])
                && "status".equals(path[2])) {
            String status = text(readBody(request), "status").toUpperCase();
            if (!Set.of("ACTIVE", "SUSPENDED").contains(status)) {
                throw new IllegalArgumentException("Status must be ACTIVE or SUSPENDED");
            }
            if (path[1].equals(adminId) && !"ACTIVE".equals(status)) {
                throw new IllegalStateException("You cannot suspend your own administrator account");
            }
            adminDAO.updateUserStatus(path[1], status, adminId, request.getRemoteAddr());
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "message", "User status updated"));
            return;
        }
        if (path.length == 3 && "users".equals(path[0])
                && "reset-password".equals(path[2])) {
            String password = text(readBody(request), "newPassword");
            if (password.length() < 8) {
                throw new IllegalArgumentException("Password must be at least 8 characters");
            }
            adminDAO.resetPassword(path[1], BCrypt.hashpw(password, BCrypt.gensalt(10)),
                    adminId, request.getRemoteAddr());
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "message", "Password updated"));
            return;
        }
        sendError(response, HttpServletResponse.SC_NOT_FOUND,
                "Administrator endpoint not found");
    }

    private void put(
            HttpServletRequest request,
            HttpServletResponse response,
            String[] path,
            String adminId) throws SQLException, IOException {
        if (path.length != 2 || !"goals".equals(path[0])) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND,
                    "Administrator endpoint not found");
            return;
        }
        Map<String, Object> body = readBody(request);
        validateParameter(body);
        adminDAO.saveGoalParameter(path[1], body, adminId, request.getRemoteAddr());
        sendJson(response, HttpServletResponse.SC_OK,
                Map.of("success", true, "message", "Goal parameter updated"));
    }

    private void delete(
            HttpServletRequest request,
            HttpServletResponse response,
            String[] path,
            String adminId) throws SQLException, IOException {
        if (path.length == 2 && "goals".equals(path[0])) {
            adminDAO.deleteGoalParameter(path[1], adminId, request.getRemoteAddr());
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "message", "Goal parameter deleted"));
            return;
        }
        if (path.length == 2 && "users".equals(path[0])) {
            if (path[1].equals(adminId)) {
                throw new IllegalStateException("You cannot delete your own administrator account");
            }
            adminDAO.deleteUser(path[1], adminId, request.getRemoteAddr());
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("success", true, "message", "User deleted"));
            return;
        }
        sendError(response, HttpServletResponse.SC_NOT_FOUND,
                "Administrator endpoint not found");
    }

    private Map<String, Object> readBody(HttpServletRequest request) throws IOException {
        try {
            return ServletJson.readObject(readJsonBody(request));
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Request body must be a JSON object");
        }
    }

    private void validateParameter(Map<String, Object> body) {
        requireText(body, "name");
        requireText(body, "categoryName");
        String metric = text(body, "metricType").toUpperCase();
        if (!METRIC_TYPES.contains(metric)) {
            throw new IllegalArgumentException("Unsupported metric type");
        }
        BigDecimal minimum = number(body, "minTargetHours");
        BigDecimal target = number(body, "defaultTargetHours");
        BigDecimal maximum = number(body, "maxTargetHours");
        if (minimum.signum() <= 0 || target.compareTo(minimum) < 0
                || target.compareTo(maximum) > 0) {
            throw new IllegalArgumentException(
                    "Target hours must be positive and within the configured range");
        }
        if (maximum.compareTo(minimum) < 0) {
            throw new IllegalArgumentException("Maximum target must not be below minimum target");
        }
        if (number(body, "difficultyMultiplier").signum() <= 0) {
            throw new IllegalArgumentException("Difficulty multiplier must be positive");
        }
        Object days = body.get("suggestedDeadlineDays");
        if (!(days instanceof Number) || ((Number) days).intValue() < 1) {
            throw new IllegalArgumentException("Suggested deadline must be at least one day");
        }
        if (!(body.get("isActive") instanceof Boolean)) {
            throw new IllegalArgumentException("isActive must be a boolean");
        }
        String color = text(body, "color");
        if (!color.matches("#[0-9A-Fa-f]{6}")) {
            throw new IllegalArgumentException("Color must use #RRGGBB format");
        }
        body.put("metricType", metric);
    }

    private void requireText(Map<String, Object> body, String key) {
        if (text(body, key).isBlank()) {
            throw new IllegalArgumentException(key + " is required");
        }
    }

    private String text(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (!(value instanceof String)) {
            throw new IllegalArgumentException(key + " is required");
        }
        return ((String) value).trim();
    }

    private BigDecimal number(Map<String, Object> body, String key) {
        Object value = body.get(key);
        if (!(value instanceof Number)) {
            throw new IllegalArgumentException(key + " must be a number");
        }
        return new BigDecimal(value.toString());
    }
}

