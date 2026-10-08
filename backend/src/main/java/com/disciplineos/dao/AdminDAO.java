package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.math.BigDecimal;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Performs administrator reporting and account/goal-parameter mutations with JDBC.
 * AdminServlet and AdminDashboardReportService call this DAO; destructive updates
 * retain an audit record in the same transaction as the requested change.
 */
public class AdminDAO {

    /** Creates an administrator data-access object. */
    public AdminDAO() { }

    /**
     * Reads aggregate account, goal, invocation, and tracked-time metrics.
     * @return aggregate account, goal, invocation, and tracked-time metrics
     * @throws SQLException if the query fails
     */
    public Map<String, Object> getStats() throws SQLException {
        String sql = """
                SELECT
                    (SELECT COUNT(*) FROM users) AS total_users,
                    (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE') AS active_users,
                    (SELECT COUNT(*) FROM goals) AS total_goals,
                    (SELECT COUNT(*) FROM goals WHERE status = 'COMPLETED') AS completed_goals,
                    (SELECT COUNT(*) FROM usage_events) AS total_tool_invocations,
                    (SELECT COALESCE(SUM(duration_minutes), 0) FROM time_logs) AS total_tracked_minutes
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            result.next();
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("totalUsers", result.getLong("total_users"));
            stats.put("activeUsers", result.getLong("active_users"));
            stats.put("totalGoals", result.getLong("total_goals"));
            stats.put("completedGoals", result.getLong("completed_goals"));
            stats.put("totalToolInvocations", result.getLong("total_tool_invocations"));
            stats.put("totalTrackedMinutes", result.getLong("total_tracked_minutes"));
            return stats;
        }
    }

    /**
     * Reads account records for administrator management.
     * @return users ordered by creation time
     * @throws SQLException if the query fails
     */
    public List<Map<String, Object>> getUsers() throws SQLException {
        String sql = """
                SELECT id, name, email, role, status, created_at, last_login
                FROM users
                ORDER BY created_at DESC
                """;
        List<Map<String, Object>> users = new ArrayList<>();

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                Map<String, Object> user = new LinkedHashMap<>();
                user.put("id", result.getString("id"));
                user.put("name", result.getString("name"));
                user.put("email", result.getString("email"));
                user.put("role", result.getString("role"));
                user.put("status", result.getString("status"));
                user.put("createdAt", result.getTimestamp("created_at"));
                user.put("lastLoginAt", result.getTimestamp("last_login"));
                user.put("lastLogin", result.getTimestamp("last_login"));
                users.add(user);
            }
        }
        return users;
    }

    /**
     * Reads configured goal category and tracking parameters.
     * @return configured goal categories and target parameters
     * @throws SQLException if the query fails
     */
    public List<Map<String, Object>> getGoalParameters() throws SQLException {
        String sql = """
                SELECT id, name, category_name, metric_type, default_target_hours,
                       min_target_hours, max_target_hours, suggested_deadline_days,
                       difficulty_multiplier, is_active, description, color
                FROM goal_parameters
                ORDER BY category_name, name
                """;
        List<Map<String, Object>> parameters = new ArrayList<>();

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                parameters.add(mapGoalParameter(result));
            }
        }
        return parameters;
    }

    /**
     * Reads recent feature-usage events for administrator monitoring.
     * @return the latest usage events
     * @throws SQLException if the query fails
     */
    public List<Map<String, Object>> getUsage() throws SQLException {
        String sql = """
                SELECT e.id, COALESCE(u.name, 'Deleted user') AS user_name,
                       e.tool, e.action, e.duration_ms, e.created_at
                FROM usage_events e
                LEFT JOIN users u ON u.id = e.user_id
                ORDER BY e.created_at DESC, e.id DESC
                LIMIT 500
                """;
        List<Map<String, Object>> events = new ArrayList<>();

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                Map<String, Object> event = new LinkedHashMap<>();
                event.put("id", result.getLong("id"));
                event.put("userName", result.getString("user_name"));
                event.put("tool", result.getString("tool"));
                event.put("action", result.getString("action"));
                event.put("durationMs", result.getLong("duration_ms"));
                event.put("timestamp", result.getTimestamp("created_at"));
                events.add(event);
            }
        }
        return events;
    }

    /**
     * Reads recent administrator actions for the audit view.
     * @return the latest administrator audit entries
     * @throws SQLException if the query fails
     */
    public List<Map<String, Object>> getAuditLogs() throws SQLException {
        String sql = """
                SELECT a.id, COALESCE(admin.email, 'Deleted administrator') AS admin_email,
                       target.email AS target_user_email, a.action, a.details,
                       a.ip_address, a.created_at
                FROM audit_logs a
                LEFT JOIN users admin ON admin.id = a.admin_id
                LEFT JOIN users target ON target.id = a.target_user_id
                ORDER BY a.created_at DESC, a.id DESC
                LIMIT 500
                """;
        List<Map<String, Object>> logs = new ArrayList<>();

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql);
             ResultSet result = statement.executeQuery()) {
            while (result.next()) {
                Map<String, Object> log = new LinkedHashMap<>();
                log.put("id", result.getLong("id"));
                log.put("adminEmail", result.getString("admin_email"));
                log.put("targetUserEmail", result.getString("target_user_email"));
                log.put("action", result.getString("action"));
                log.put("details", result.getString("details"));
                log.put("ipAddress", result.getString("ip_address"));
                log.put("timestamp", result.getTimestamp("created_at"));
                logs.add(log);
            }
        }
        return logs;
    }

    /**
     * Updates an account and writes its audit event atomically.
     *
     * @param targetUserId account to update
     * @param status requested account status
     * @param adminId administrator performing the update
     * @param ipAddress administrator client address
     * @throws SQLException if persistence fails
     * @throws IllegalStateException if the final active administrator would be suspended
     */
    public void updateUserStatus(
            String targetUserId,
            String status,
            String adminId,
            String ipAddress) throws SQLException {
        String selectUser = "SELECT email, role, status FROM users WHERE id = ? FOR UPDATE";
        String updateUser = "UPDATE users SET status = ? WHERE id = ?";

        try (Connection connection = DBConnection.getConnection()) {
            // Lock, mutate, audit, and commit together so failed audit writes cannot leave partial changes.
            connection.setAutoCommit(false);
            try {
                String email;
                String role;
                String currentStatus;
                try (PreparedStatement statement = connection.prepareStatement(selectUser)) {
                    statement.setString(1, targetUserId);
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) {
                            throw new SQLException("User not found");
                        }
                        email = result.getString("email");
                        role = result.getString("role");
                        currentStatus = result.getString("status");
                    }
                }

                if ("ADMIN".equals(role)
                        && "ACTIVE".equals(currentStatus)
                        && !"ACTIVE".equals(status)
                        && countOtherActiveAdmins(connection, targetUserId) == 0) {
                    throw new IllegalStateException("At least one active administrator must remain");
                }

                try (PreparedStatement statement = connection.prepareStatement(updateUser)) {
                    statement.setString(1, status);
                    statement.setString(2, targetUserId);
                    statement.executeUpdate();
                }
                insertAudit(connection, adminId, targetUserId, "UPDATE_USER_STATUS",
                        "Changed " + email + " status to " + status, ipAddress);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        }
    }

    /**
     * Deletes an account and records the action in one transaction.
     *
     * @param targetUserId account to delete
     * @param adminId administrator performing the deletion
     * @param ipAddress administrator client address
     * @throws SQLException if persistence fails or the account does not exist
     * @throws IllegalStateException if the final active administrator would be deleted
     */
    public void deleteUser(String targetUserId, String adminId, String ipAddress)
            throws SQLException {
        try (Connection connection = DBConnection.getConnection()) {
            // Keep the account removal and audit entry atomic.
            connection.setAutoCommit(false);
            try {
                String email;
                String role;
                try (PreparedStatement statement = connection.prepareStatement(
                        "SELECT email, role FROM users WHERE id = ? FOR UPDATE")) {
                    statement.setString(1, targetUserId);
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) {
                            throw new SQLException("User not found");
                        }
                        email = result.getString("email");
                        role = result.getString("role");
                    }
                }

                if ("ADMIN".equals(role) && countOtherActiveAdmins(connection, targetUserId) == 0) {
                    throw new IllegalStateException("The last active administrator cannot be deleted");
                }

                insertAudit(connection, adminId, targetUserId, "DELETE_USER",
                        "Deleted account " + email, ipAddress);
                try (PreparedStatement statement = connection.prepareStatement(
                        "DELETE FROM users WHERE id = ?")) {
                    statement.setString(1, targetUserId);
                    statement.executeUpdate();
                }
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        }
    }

    /**
     * Resets an account password and audits the change atomically.
     *
     * @param targetUserId account whose password is reset
     * @param passwordHash already-hashed password
     * @param adminId administrator performing the reset
     * @param ipAddress administrator client address
     * @throws SQLException if persistence fails or the account does not exist
     */
    public void resetPassword(
            String targetUserId,
            String passwordHash,
            String adminId,
            String ipAddress) throws SQLException {
        try (Connection connection = DBConnection.getConnection()) {
            // Password change and audit entry must either both commit or both roll back.
            connection.setAutoCommit(false);
            try {
                String email;
                try (PreparedStatement statement = connection.prepareStatement(
                        "SELECT email FROM users WHERE id = ? FOR UPDATE")) {
                    statement.setString(1, targetUserId);
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) {
                            throw new SQLException("User not found");
                        }
                        email = result.getString("email");
                    }
                }
                try (PreparedStatement statement = connection.prepareStatement(
                        "UPDATE users SET password_hash = ? WHERE id = ?")) {
                    statement.setString(1, passwordHash);
                    statement.setString(2, targetUserId);
                    statement.executeUpdate();
                }
                insertAudit(connection, adminId, targetUserId, "RESET_USER_PASSWORD",
                        "Reset password for " + email, ipAddress);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        }
    }

    /**
     * Inserts or updates a goal parameter and records the mutation atomically.
     *
     * @param id existing parameter id, or {@code null} to create
     * @param parameter validated parameter fields
     * @param adminId administrator performing the change
     * @param ipAddress administrator client address
     * @return id of the saved parameter
     * @throws SQLException if persistence fails
     */
    public String saveGoalParameter(
            String id,
            Map<String, Object> parameter,
            String adminId,
            String ipAddress) throws SQLException {
        boolean create = id == null;
        String parameterId = create
                ? "param_" + UUID.randomUUID().toString().replace("-", "")
                : id;
        String sql = create
                ? """
                  INSERT INTO goal_parameters
                    (id, name, category_name, metric_type, default_target_hours,
                     min_target_hours, max_target_hours, suggested_deadline_days,
                     difficulty_multiplier, is_active, description, color)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  """
                : """
                  UPDATE goal_parameters
                  SET name = ?, category_name = ?, metric_type = ?,
                      default_target_hours = ?, min_target_hours = ?, max_target_hours = ?,
                      suggested_deadline_days = ?, difficulty_multiplier = ?,
                      is_active = ?, description = ?, color = ?
                  WHERE id = ?
                  """;

        try (Connection connection = DBConnection.getConnection()) {
            // Parameter state and its audit entry share a transaction.
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    int index = 1;
                    if (create) {
                        statement.setString(index++, parameterId);
                    }
                    statement.setString(index++, (String) parameter.get("name"));
                    statement.setString(index++, (String) parameter.get("categoryName"));
                    statement.setString(index++, (String) parameter.get("metricType"));
                    statement.setBigDecimal(index++, decimal(parameter, "defaultTargetHours"));
                    statement.setBigDecimal(index++, decimal(parameter, "minTargetHours"));
                    statement.setBigDecimal(index++, decimal(parameter, "maxTargetHours"));
                    statement.setInt(index++, ((Number) parameter.get("suggestedDeadlineDays")).intValue());
                    statement.setBigDecimal(index++, decimal(parameter, "difficultyMultiplier"));
                    statement.setBoolean(index++, (Boolean) parameter.get("isActive"));
                    statement.setString(index++, (String) parameter.get("description"));
                    statement.setString(index++, (String) parameter.get("color"));
                    if (!create) {
                        statement.setString(index, parameterId);
                    }
                    if (statement.executeUpdate() == 0) {
                        throw new SQLException("Goal parameter not found");
                    }
                }
                insertAudit(connection, adminId, null,
                        create ? "CREATE_GOAL_PARAMETER" : "UPDATE_GOAL_PARAMETER",
                        (create ? "Created" : "Updated") + " goal parameter "
                                + parameter.get("name"), ipAddress);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        }
        return parameterId;
    }

    /**
     * Deletes a goal parameter and writes an audit record in one transaction.
     *
     * @param id parameter to delete
     * @param adminId administrator performing the deletion
     * @param ipAddress administrator client address
     * @throws SQLException if persistence fails or the parameter does not exist
     */
    public void deleteGoalParameter(String id, String adminId, String ipAddress)
            throws SQLException {
        try (Connection connection = DBConnection.getConnection()) {
            connection.setAutoCommit(false);
            try {
                String name;
                try (PreparedStatement statement = connection.prepareStatement(
                        "SELECT name FROM goal_parameters WHERE id = ? FOR UPDATE")) {
                    statement.setString(1, id);
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) {
                            throw new SQLException("Goal parameter not found");
                        }
                        name = result.getString("name");
                    }
                }
                try (PreparedStatement statement = connection.prepareStatement(
                        "DELETE FROM goal_parameters WHERE id = ?")) {
                    statement.setString(1, id);
                    statement.executeUpdate();
                }
                insertAudit(connection, adminId, null, "DELETE_GOAL_PARAMETER",
                        "Deleted goal parameter " + name, ipAddress);
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        }
    }

    private int countOtherActiveAdmins(Connection connection, String excludedId)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT id FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' ORDER BY id FOR UPDATE")) {
            try (ResultSet result = statement.executeQuery()) {
                int count = 0;
                while (result.next()) {
                    if (!excludedId.equals(result.getString("id"))) {
                        count++;
                    }
                }
                return count;
            }
        }
    }

    private void insertAudit(
            Connection connection,
            String adminId,
            String targetId,
            String action,
            String details,
            String ipAddress) throws SQLException {
        String sql = """
                INSERT INTO audit_logs (admin_id, target_user_id, action, details, ip_address)
                VALUES (?, ?, ?, ?, ?)
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, adminId);
            statement.setString(2, targetId);
            statement.setString(3, action);
            statement.setString(4, details);
            statement.setString(5, ipAddress == null ? "" : ipAddress);
            statement.executeUpdate();
        }
    }

    private Map<String, Object> mapGoalParameter(ResultSet result) throws SQLException {
        Map<String, Object> parameter = new LinkedHashMap<>();
        parameter.put("id", result.getString("id"));
        parameter.put("name", result.getString("name"));
        parameter.put("categoryName", result.getString("category_name"));
        parameter.put("metricType", result.getString("metric_type"));
        parameter.put("defaultTargetHours", result.getBigDecimal("default_target_hours"));
        parameter.put("minTargetHours", result.getBigDecimal("min_target_hours"));
        parameter.put("maxTargetHours", result.getBigDecimal("max_target_hours"));
        parameter.put("suggestedDeadlineDays", result.getInt("suggested_deadline_days"));
        parameter.put("difficultyMultiplier", result.getBigDecimal("difficulty_multiplier"));
        parameter.put("isActive", result.getBoolean("is_active"));
        parameter.put("description", result.getString("description"));
        parameter.put("color", result.getString("color"));
        return parameter;
    }

    private BigDecimal decimal(Map<String, Object> parameter, String key) {
        return new BigDecimal(((Number) parameter.get(key)).toString());
    }

    private void rollback(Connection connection, Exception original) {
        try {
            connection.rollback();
        } catch (SQLException rollbackFailure) {
            original.addSuppressed(rollbackFailure);
        }
    }
}

