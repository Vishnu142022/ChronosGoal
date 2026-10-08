package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Persists habit definitions and their date-based completion history.
 * HabitServlet always supplies the owner id from the authenticated session.
 */
public class HabitDAO {

    /** Creates a habit data-access object. */
    public HabitDAO() { }

    /**
     * Lists owned habits with their completion history.
     *
     * @param userId authenticated owner id
     * @return habits ordered by creation time
     * @throws DataAccessException if the database query fails
     */
    public List<HabitData> list(String userId) {
        String sql = """
                SELECT id, user_id, name, description, category, category_color, frequency,
                       time_of_day, reminder, start_date, weekly_target, monthly_target,
                       monthly_unit, created_at
                FROM habits WHERE user_id = ? ORDER BY created_at
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            try (ResultSet result = statement.executeQuery()) {
                List<HabitData> habits = new ArrayList<>();
                while (result.next()) {
                    HabitData base = map(result);
                    habits.add(withHistory(connection, base));
                }
                return habits;
            }
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to load habits", exception);
        }
    }

    /**
     * Creates a habit and its initial history atomically.
     *
     * @param userId authenticated owner id
     * @param input validated habit fields and initial history
     * @return newly created habit data
     * @throws DataAccessException if creation or history insertion fails
     */
    public HabitData create(String userId, HabitInput input) {
        String id = "habit_" + UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO habits
                (id, user_id, name, description, category, category_color, frequency, time_of_day,
                 reminder, start_date, weekly_target, monthly_target, monthly_unit)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = DBConnection.getConnection()) {
            // Keep the habit row and its date history atomic if either write fails.
            connection.setAutoCommit(false);
            try {
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    bind(statement, id, userId, input);
                    statement.executeUpdate();
                }
                replaceHistory(connection, id, userId, input.history());
                connection.commit();
                return find(connection, userId, id);
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to create habit", exception);
        }
    }

    /**
     * Updates an owned habit and replaces its history in one transaction.
     *
     * @param userId authenticated owner id
     * @param id habit id
     * @param input replacement fields and history
     * @return updated habit, or {@code null} if the habit is not owned by this user
     * @throws DataAccessException if the update or history replacement fails
     */
    public HabitData update(String userId, String id, HabitInput input) {
        String sql = """
                UPDATE habits SET name = ?, description = ?, category = ?, category_color = ?,
                    frequency = ?, time_of_day = ?, reminder = ?, start_date = ?, weekly_target = ?,
                    monthly_target = ?, monthly_unit = ? WHERE id = ? AND user_id = ?
                """;
        try (Connection connection = DBConnection.getConnection()) {
            // Keep the field update and replacement history in the same transaction.
            connection.setAutoCommit(false);
            try {
                int updated;
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    bindUpdate(statement, id, userId, input);
                    updated = statement.executeUpdate();
                }
                if (updated == 0) {
                    connection.rollback();
                    return null;
                }
                replaceHistory(connection, id, userId, input.history());
                connection.commit();
                return find(connection, userId, id);
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to update habit", exception);
        }
    }

    /**
     * Toggles one date's completion marker for an owned habit.
     *
     * @param userId authenticated owner id
     * @param id habit id
     * @param date completion date
     * @return updated habit, or {@code null} if not owned
     * @throws DataAccessException if the log update fails
     */
    public HabitData toggle(String userId, String id, Date date) {
        String select = "SELECT status FROM habit_logs WHERE habit_id = ? AND user_id = ? AND log_date = ?";
        String delete = "DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ? AND log_date = ?";
        String upsert = """
                INSERT INTO habit_logs (habit_id, user_id, log_date, status) VALUES (?, ?, ?, 'COMPLETED')
                ON DUPLICATE KEY UPDATE status = 'COMPLETED'
                """;
        try (Connection connection = DBConnection.getConnection()) {
            // Do not leave a date log partially toggled if the read/update sequence fails.
            connection.setAutoCommit(false);
            try {
                if (!isOwned(connection, userId, id)) {
                    connection.rollback();
                    return null;
                }
                boolean exists;
                try (PreparedStatement statement = connection.prepareStatement(select)) {
                    statement.setString(1, id);
                    statement.setString(2, userId);
                    statement.setDate(3, date);
                    try (ResultSet result = statement.executeQuery()) {
                        exists = result.next();
                    }
                }
                try (PreparedStatement statement = connection.prepareStatement(exists ? delete : upsert)) {
                    statement.setString(1, id);
                    statement.setString(2, userId);
                    statement.setDate(3, date);
                    statement.executeUpdate();
                }
                connection.commit();
                return find(connection, userId, id);
            } catch (SQLException | RuntimeException exception) {
                connection.rollback();
                throw exception;
            } finally {
                connection.setAutoCommit(true);
            }
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to toggle habit log", exception);
        }
    }

    /**
     * Adds or removes a frozen marker for a habit date.
     *
     * @param userId authenticated owner id
     * @param id habit id
     * @param date date to freeze
     * @return updated habit, or {@code null} if not owned
     * @throws DataAccessException if the freeze update fails
     */
    public HabitData freeze(String userId, String id, Date date) {
        String sql = """
                INSERT INTO habit_logs (habit_id, user_id, log_date, status) VALUES (?, ?, ?, 'FROZEN')
                ON DUPLICATE KEY UPDATE status = 'FROZEN'
                """;
        try (Connection connection = DBConnection.getConnection()) {
            if (!isOwned(connection, userId, id)) {
                return null;
            }
            try (PreparedStatement statement = connection.prepareStatement(sql)) {
                statement.setString(1, id);
                statement.setString(2, userId);
                statement.setDate(3, date);
                statement.executeUpdate();
            }
            return find(connection, userId, id);
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to freeze habit", exception);
        }
    }

    /**
     * Deletes a habit owned by the given user; history is removed by its foreign key.
     *
     * @param userId authenticated owner id
     * @param id habit id
     * @return whether a habit was deleted
     * @throws DataAccessException if the delete fails
     */
    public boolean delete(String userId, String id) {
        String sql = "DELETE FROM habits WHERE id = ? AND user_id = ?";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, id);
            statement.setString(2, userId);
            return statement.executeUpdate() > 0;
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to delete habit", exception);
        }
    }

    private void bind(PreparedStatement statement, String id, String userId, HabitInput input)
            throws SQLException {
        statement.setString(1, id);
        statement.setString(2, userId);
        bindFields(statement, 3, input);
    }

    private void bindUpdate(PreparedStatement statement, String id, String userId, HabitInput input)
            throws SQLException {
        bindFields(statement, 1, input);
        statement.setString(12, id);
        statement.setString(13, userId);
    }

    private void bindFields(PreparedStatement statement, int start, HabitInput input)
            throws SQLException {
        statement.setString(start, input.name());
        statement.setString(start + 1, input.description());
        statement.setString(start + 2, input.category());
        statement.setString(start + 3, input.categoryColor());
        statement.setString(start + 4, input.frequency());
        statement.setString(start + 5, input.timeOfDay());
        statement.setString(start + 6, input.reminder());
        statement.setDate(start + 7, input.startDate());
        if (input.weeklyTarget() == null) statement.setNull(start + 8, java.sql.Types.INTEGER);
        else statement.setInt(start + 8, input.weeklyTarget());
        if (input.monthlyTarget() == null) statement.setNull(start + 9, java.sql.Types.INTEGER);
        else statement.setInt(start + 9, input.monthlyTarget());
        statement.setString(start + 10, input.monthlyUnit());
    }

    private void replaceHistory(Connection connection, String id, String userId,
                                Map<String, String> history)
            throws SQLException {
        try (PreparedStatement delete = connection.prepareStatement(
                "DELETE FROM habit_logs WHERE habit_id = ? AND user_id = ?")) {
            delete.setString(1, id);
            delete.setString(2, userId);
            delete.executeUpdate();
        }
        if (history == null || history.isEmpty()) return;
        String sql = "INSERT INTO habit_logs (habit_id, user_id, log_date, status) VALUES (?, ?, ?, ?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (Map.Entry<String, String> entry : history.entrySet()) {
                statement.setString(1, id);
                statement.setString(2, userId);
                statement.setDate(3, Date.valueOf(entry.getKey()));
                statement.setString(4, normalizeStatus(entry.getValue()));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    private String normalizeStatus(String status) {
        return "FROZEN".equals(status) ? "FROZEN"
                : "MISSED".equals(status) ? "MISSED" : "COMPLETED";
    }

    private boolean isOwned(Connection connection, String userId, String id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM habits WHERE id = ? AND user_id = ?")) {
            statement.setString(1, id);
            statement.setString(2, userId);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    private HabitData find(Connection connection, String userId, String id) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement("""
                SELECT id, user_id, name, description, category, category_color, frequency,
                       time_of_day, reminder, start_date, weekly_target, monthly_target,
                       monthly_unit, created_at FROM habits WHERE user_id = ? AND id = ?
                """)) {
            statement.setString(1, userId);
            statement.setString(2, id);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? withHistory(connection, map(result)) : null;
            }
        }
    }

    private HabitData withHistory(Connection connection, HabitData base) throws SQLException {
        Map<String, String> history = new LinkedHashMap<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT log_date, status FROM habit_logs WHERE habit_id = ? AND user_id = ? ORDER BY log_date")) {
            statement.setString(1, base.id());
            statement.setString(2, base.userId());
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) {
                    history.put(result.getDate("log_date").toString(), result.getString("status"));
                }
            }
        }
        return base.withHistory(history);
    }

    private HabitData map(ResultSet result) throws SQLException {
        return new HabitData(result.getString("id"), result.getString("user_id"),
                result.getString("name"), result.getString("description"),
                result.getString("category"), result.getString("category_color"),
                result.getString("frequency"), result.getString("time_of_day"),
                result.getString("reminder"), result.getDate("start_date"),
                nullableInteger(result.getObject("weekly_target")),
                nullableInteger(result.getObject("monthly_target")),
                result.getString("monthly_unit"), result.getTimestamp("created_at"), Map.of());
    }

    static Integer nullableInteger(Object value) throws SQLException {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.intValue();
        }
        throw new SQLException("Expected a numeric value for an integer habit target");
    }

    /**
     * Input fields required to create or replace a habit.
     *
     * @param name habit name
     * @param description optional details
     * @param category grouping label
     * @param categoryColor display color
     * @param frequency schedule type
     * @param timeOfDay optional time-of-day label
     * @param reminder optional reminder text
     * @param startDate optional start date
     * @param weeklyTarget optional weekly target
     * @param monthlyTarget optional monthly target
     * @param monthlyUnit optional unit label
     * @param history date-keyed habit statuses
     */
    public record HabitInput(String name, String description, String category, String categoryColor,
                             String frequency, String timeOfDay, String reminder, Date startDate,
                             Integer weeklyTarget, Integer monthlyTarget, String monthlyUnit,
                             Map<String, String> history) { }

    /**
     * Database representation of a habit and its day-status history.
     *
     * @param id habit identifier
     * @param userId authenticated owner identifier
     * @param name habit name
     * @param description optional details
     * @param category grouping label
     * @param categoryColor display color
     * @param frequency schedule type
     * @param timeOfDay optional time-of-day label
     * @param reminder optional reminder text
     * @param startDate optional start date
     * @param weeklyTarget optional weekly target
     * @param monthlyTarget optional monthly target
     * @param monthlyUnit optional unit label
     * @param createdAt creation timestamp
     * @param history date-keyed habit statuses
     */
    public record HabitData(String id, String userId, String name, String description, String category,
                            String categoryColor, String frequency, String timeOfDay, String reminder,
                            Date startDate, Integer weeklyTarget, Integer monthlyTarget, String monthlyUnit,
                            java.sql.Timestamp createdAt, Map<String, String> history) {
        private HabitData withHistory(Map<String, String> value) {
            return new HabitData(id, userId, name, description, category, categoryColor, frequency,
                    timeOfDay, reminder, startDate, weeklyTarget, monthlyTarget, monthlyUnit, createdAt, value);
        }
    }
}

