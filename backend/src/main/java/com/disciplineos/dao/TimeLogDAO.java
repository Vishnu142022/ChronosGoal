package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Implements user-scoped JDBC operations for goal time logs.
 * TimeLogServlet supplies the owner from the active session; prepared statements
 * and ownership conditions prevent cross-account reads and writes.
 */
public class TimeLogDAO {

    /** Creates a time-log data-access object. */
    public TimeLogDAO() { }

    /**
     * Inserts a time log only if its goal belongs to the same user.
     *
     * @param userId authenticated owner id
     * @param goalId parent goal id
     * @param logDate calendar date
     * @param startTime session start time
     * @param endTime session end time
     * @param durationMinutes validated duration
     * @param notes optional notes
     * @param productivityRating optional rating from 1 to 5
     * @return created row, or {@code null} if the goal is not owned
     */
    public TimeLogData createTimeLog(
            String userId,
            String goalId,
            Date logDate,
            String startTime,
            String endTime,
            int durationMinutes,
            String notes,
            Integer productivityRating) {

        String insertSql = """
                INSERT INTO time_logs
                (id, user_id, goal_id, log_date, start_time,
                 end_time, duration_minutes, notes, productivity_rating)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;
        String goalSql = "SELECT id FROM goals WHERE id = ? AND user_id = ? FOR UPDATE";

        String id = "log_" +
                UUID.randomUUID().toString().replace("-", "");

        try (Connection connection = DBConnection.getConnection()) {
            connection.setAutoCommit(false);
            try {
                if (!goalBelongsToUser(connection, goalSql, goalId, userId)) {
                    connection.rollback();
                    return null;
                }

                TimeLogData created;
                try (PreparedStatement statement = connection.prepareStatement(insertSql)) {
                    statement.setString(1, id);
                    statement.setString(2, userId);
                    statement.setString(3, goalId);
                    statement.setDate(4, logDate);
                    statement.setString(5, startTime);
                    statement.setString(6, endTime);
                    statement.setInt(7, durationMinutes);
                    statement.setString(8, notes);
                    if (productivityRating == null) {
                        statement.setNull(9, Types.TINYINT);
                    } else {
                        statement.setInt(9, productivityRating);
                    }
                    if (statement.executeUpdate() == 0) {
                        connection.rollback();
                        return null;
                    }
                    created = getTimeLogById(connection, id, userId);
                }
                if (created == null) {
                    throw new SQLException("Inserted time log could not be retrieved");
                }
                connection.commit();
                return created;
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        } catch (SQLException e) {
            throw new DataAccessException("Unable to create time log", e);
        }
    }


    /**
     * Loads all logs for an authenticated owner.
     *
     * @param userId authenticated owner id
     * @return logs ordered newest first
     */
    public List<TimeLogData> getTimeLogsByUser(String userId) {

        List<TimeLogData> logs = new ArrayList<>();

        String sql = """
                SELECT t.id, t.user_id, t.goal_id, t.log_date,
                       t.start_time, t.end_time, t.duration_minutes,
                       t.notes, t.productivity_rating, t.created_at,
                       g.name AS goal_name
                FROM time_logs t
                INNER JOIN goals g ON g.id = t.goal_id
                WHERE t.user_id = ?
                ORDER BY t.log_date DESC, t.created_at DESC
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, userId);

            try (ResultSet rs = statement.executeQuery()) {

                while (rs.next()) {
                    logs.add(mapTimeLog(rs));
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to load time logs", e);
        }

        return logs;
    }


    /**
     * Loads logs for an owned goal.
     *
     * @param goalId goal id
     * @param userId authenticated owner id
     * @return matching logs newest first
     */
    public List<TimeLogData> getTimeLogsByGoal(
            String goalId,
            String userId) {

        List<TimeLogData> logs = new ArrayList<>();

        String sql = """
                SELECT t.id, t.user_id, t.goal_id, t.log_date,
                       t.start_time, t.end_time, t.duration_minutes,
                       t.notes, t.productivity_rating, t.created_at,
                       g.name AS goal_name
                FROM time_logs t
                INNER JOIN goals g ON g.id = t.goal_id
                WHERE t.goal_id = ? AND t.user_id = ?
                ORDER BY t.log_date DESC, t.created_at DESC
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, goalId);
            statement.setString(2, userId);

            try (ResultSet rs = statement.executeQuery()) {

                while (rs.next()) {
                    logs.add(mapTimeLog(rs));
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to load goal time logs", e);
        }

        return logs;
    }


    /**
     * Loads one log only when it belongs to the requested user.
     *
     * @param logId requested log id
     * @param userId authenticated owner id
     * @return matching log, or {@code null}
     */
    public TimeLogData getTimeLogById(
            String logId,
            String userId) {

        try (Connection connection = DBConnection.getConnection()) {
            return getTimeLogById(connection, logId, userId);
        } catch (SQLException e) {
            throw new DataAccessException("Unable to load time log", e);
        }
    }

    private TimeLogData getTimeLogById(
            Connection connection,
            String logId,
            String userId) throws SQLException {
        String sql = """
                SELECT t.id, t.user_id, t.goal_id, t.log_date,
                       t.start_time, t.end_time, t.duration_minutes,
                       t.notes, t.productivity_rating, t.created_at,
                       g.name AS goal_name
                FROM time_logs t
                INNER JOIN goals g ON g.id = t.goal_id
                WHERE t.id = ? AND t.user_id = ?
                """;

        try (PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, logId);
            statement.setString(2, userId);

            try (ResultSet rs = statement.executeQuery()) {

                if (rs.next()) {
                    return mapTimeLog(rs);
                }
            }

        }
        return null;
    }


    /**
     * Updates a log and verifies its new goal has the same owner.
     *
     * @param logId requested log id
     * @param userId authenticated owner id
     * @param goalId new parent goal
     * @param logDate calendar date
     * @param startTime session start time
     * @param endTime session end time
     * @param durationMinutes validated duration
     * @param notes optional notes
     * @param productivityRating optional rating
     * @return whether a row was updated
     */
    public boolean updateTimeLog(
            String logId,
            String userId,
            String goalId,
            Date logDate,
            String startTime,
            String endTime,
            int durationMinutes,
            String notes,
            Integer productivityRating) {

        String goalSql = "SELECT id FROM goals WHERE id = ? AND user_id = ? FOR UPDATE";
        String sql = """
                UPDATE time_logs
                SET goal_id = ?,
                    log_date = ?,
                    start_time = ?,
                    end_time = ?,
                    duration_minutes = ?,
                    notes = ?,
                    productivity_rating = ?
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DBConnection.getConnection()) {
            connection.setAutoCommit(false);
            try {
                if (!goalBelongsToUser(connection, goalSql, goalId, userId)) {
                    connection.rollback();
                    return false;
                }

                int updated;
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    statement.setString(1, goalId);
                    statement.setDate(2, logDate);
                    statement.setString(3, startTime);
                    statement.setString(4, endTime);
                    statement.setInt(5, durationMinutes);
                    statement.setString(6, notes);
                    if (productivityRating == null) {
                        statement.setNull(7, Types.TINYINT);
                    } else {
                        statement.setInt(7, productivityRating);
                    }
                    statement.setString(8, logId);
                    statement.setString(9, userId);
                    updated = statement.executeUpdate();
                }
                if (updated == 0) {
                    connection.rollback();
                    return false;
                }
                connection.commit();
                return true;
            } catch (SQLException | RuntimeException exception) {
                rollback(connection, exception);
                throw exception;
            }
        } catch (SQLException e) {
            throw new DataAccessException("Unable to update time log", e);
        }
    }


    /**
     * Deletes a log only when it belongs to the owner.
     *
     * @param logId requested log id
     * @param userId authenticated owner id
     * @return whether a row was deleted
     */
    public boolean deleteTimeLog(
            String logId,
            String userId) {

        String sql = """
                DELETE FROM time_logs
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, logId);
            statement.setString(2, userId);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to delete time log", e);
        }
    }


    // Convert ResultSet row into TimeLogData
    private TimeLogData mapTimeLog(ResultSet rs)
            throws SQLException {

        return new TimeLogData(
                rs.getString("id"),
                rs.getString("user_id"),
                rs.getString("goal_id"),
                rs.getDate("log_date"),
                rs.getString("start_time"),
                rs.getString("end_time"),
                rs.getInt("duration_minutes"),
                rs.getString("notes"),
                rs.getObject("productivity_rating") == null
                        ? null
                        : rs.getInt("productivity_rating"),
                rs.getTimestamp("created_at"),
                rs.getString("goal_name")
        );
    }

    private boolean goalBelongsToUser(
            Connection connection,
            String sql,
            String goalId,
            String userId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, goalId);
            statement.setString(2, userId);
            try (ResultSet result = statement.executeQuery()) {
                return result.next();
            }
        }
    }

    private void rollback(Connection connection, Exception originalException) {
        try {
            connection.rollback();
        } catch (SQLException rollbackException) {
            originalException.addSuppressed(rollbackException);
        }
    }


    /** Immutable time-log query result including its display goal name. */
    public static class TimeLogData {

        private final String id;
        private final String userId;
        private final String goalId;
        private final Date logDate;
        private final String startTime;
        private final String endTime;
        private final int durationMinutes;
        private final String notes;
        private final Integer productivityRating;
        private final Timestamp createdAt;
        private final String goalName;

        /**
         * Creates a time-log result from one joined database row.
         *
         * @param id time-log id
         * @param userId owner id
         * @param goalId goal id
         * @param logDate date
         * @param startTime start time
         * @param endTime end time
         * @param durationMinutes elapsed minutes
         * @param notes optional notes
         * @param productivityRating optional rating
         * @param createdAt insert timestamp
         * @param goalName goal display name
         */
        public TimeLogData(
                String id,
                String userId,
                String goalId,
                Date logDate,
                String startTime,
                String endTime,
                int durationMinutes,
                String notes,
                Integer productivityRating,
                Timestamp createdAt,
                String goalName) {

            this.id = id;
            this.userId = userId;
            this.goalId = goalId;
            this.logDate = logDate;
            this.startTime = startTime;
            this.endTime = endTime;
            this.durationMinutes = durationMinutes;
            this.notes = notes;
            this.productivityRating = productivityRating;
            this.createdAt = createdAt;
            this.goalName = goalName;
        }

        /**
         * Returns the log identifier.
         *
         * @return the log identifier
         */
        public String getId() {
            return id;
        }

        /**
         * Returns the owner identifier.
         *
         * @return the owner identifier
         */
        public String getUserId() {
            return userId;
        }

        /**
         * Returns the goal identifier.
         *
         * @return the goal identifier
         */
        public String getGoalId() {
            return goalId;
        }

        /**
         * Returns the logged calendar date.
         *
         * @return the logged calendar date
         */
        public Date getLogDate() {
            return logDate;
        }

        /**
         * Returns the session start time.
         *
         * @return the session start time
         */
        public String getStartTime() {
            return startTime;
        }

        /**
         * Returns the session end time.
         *
         * @return the session end time
         */
        public String getEndTime() {
            return endTime;
        }

        /**
         * Returns the elapsed time in minutes.
         *
         * @return the elapsed time in minutes
         */
        public int getDurationMinutes() {
            return durationMinutes;
        }

        /**
         * Returns the optional session notes.
         *
         * @return the session notes, or {@code null} when absent
         */
        public String getNotes() {
            return notes;
        }

        /**
         * Returns the optional productivity rating.
         *
         * @return the rating, or {@code null} when absent
         */
        public Integer getProductivityRating() {
            return productivityRating;
        }

        /**
         * Returns the insertion timestamp.
         *
         * @return the insertion timestamp
         */
        public Timestamp getCreatedAt() {
            return createdAt;
        }

        /**
         * Returns the associated goal's display name.
         *
         * @return the associated goal's display name
         */
        public String getGoalName() {
            return goalName;
        }
    }
}
