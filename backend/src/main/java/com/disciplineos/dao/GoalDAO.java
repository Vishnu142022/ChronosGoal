package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Provides prepared-statement CRUD operations for user-owned goals.
 * GoalServlet and GoalStepServlet pass the authenticated session owner to every lookup.
 */
public class GoalDAO {

    /** Creates a goal data-access object. */
    public GoalDAO() { }

    /**
     * Creates a goal for the supplied authenticated owner.
     *
     * @param userId owner id from the server session
     * @param name goal name
     * @param category goal category
     * @param targetHours positive target hours
     * @param deadline target date
     * @param startDate start date
     * @param priority priority value
     * @param description optional description
     * @return generated goal id, or {@code null} if no row was inserted
     */
    public String createGoal(
            String userId,
            String name,
            String category,
            double targetHours,
            Date deadline,
            Date startDate,
            String priority,
            String description) {

        String sql = """
                INSERT INTO goals
                (id, user_id, name, category, target_hours,
                 deadline, start_date, priority, status, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NOT_STARTED', ?)
                """;

        String id = "goal_" +
                UUID.randomUUID().toString().replace("-", "");

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, id);
            statement.setString(2, userId);
            statement.setString(3, name);
            statement.setString(4, category);
            statement.setDouble(5, targetHours);
            statement.setDate(6, deadline);
            statement.setDate(7, startDate);
            statement.setString(8, priority);
            statement.setString(9, description);

            return statement.executeUpdate() > 0 ? id : null;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to create goal", e);
        }
    }

    /**
     * Loads goals belonging to one user.
     *
     * @param userId authenticated owner id
     * @return goals ordered by deadline
     */
    public List<GoalData> getGoalsByUser(String userId) {

        List<GoalData> goals = new ArrayList<>();

        String sql = """
                SELECT id, user_id, name, category, target_hours,
                       deadline, start_date, priority, status,
                       description, total_logged_minutes
                FROM goals
                WHERE user_id = ?
                ORDER BY deadline ASC
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, userId);

            try (ResultSet rs = statement.executeQuery()) {

                while (rs.next()) {

                    goals.add(new GoalData(
                            rs.getString("id"),
                            rs.getString("user_id"),
                            rs.getString("name"),
                            rs.getString("category"),
                            rs.getDouble("target_hours"),
                            rs.getDate("deadline"),
                            rs.getDate("start_date"),
                            rs.getString("priority"),
                            rs.getString("status"),
                            rs.getString("description"),
                            rs.getInt("total_logged_minutes")
                    ));
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to load goals", e);
        }

        return goals;
    }

    /**
     * Loads one goal only when it belongs to the specified user.
     *
     * @param goalId requested goal id
     * @param userId authenticated owner id
     * @return matching goal, or {@code null} when absent or not owned
     */
    public GoalData getGoalById(
            String goalId,
            String userId) {

        String sql = """
                SELECT id, user_id, name, category, target_hours,
                       deadline, start_date, priority, status,
                       description, total_logged_minutes
                FROM goals
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, goalId);
            statement.setString(2, userId);

            try (ResultSet rs = statement.executeQuery()) {

                if (rs.next()) {

                    return new GoalData(
                            rs.getString("id"),
                            rs.getString("user_id"),
                            rs.getString("name"),
                            rs.getString("category"),
                            rs.getDouble("target_hours"),
                            rs.getDate("deadline"),
                            rs.getDate("start_date"),
                            rs.getString("priority"),
                            rs.getString("status"),
                            rs.getString("description"),
                            rs.getInt("total_logged_minutes")
                    );
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to load goal", e);
        }

        return null;
    }

    /**
     * Deletes an owned goal.
     *
     * @param goalId requested goal id
     * @param userId authenticated owner id
     * @return whether a row was deleted
     */
    public boolean deleteGoal(
            String goalId,
            String userId) {

        String sql = """
                DELETE FROM goals
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, goalId);
            statement.setString(2, userId);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to delete goal", e);
        }
    }

    /**
     * Updates an owned goal.
     *
     * @param goalId requested goal id
     * @param userId authenticated owner id
     * @param name goal name
     * @param category goal category
     * @param targetHours target hours
     * @param deadline target date
     * @param startDate start date
     * @param priority priority
     * @param status goal status
     * @param description optional description
     * @return whether a row was updated
     */
    public boolean updateGoal(
            String goalId,
            String userId,
            String name,
            String category,
            double targetHours,
            Date deadline,
            Date startDate,
            String priority,
            String status,
            String description) {

        String sql = """
                UPDATE goals
                SET name = ?,
                    category = ?,
                    target_hours = ?,
                    deadline = ?,
                    start_date = ?,
                    priority = ?,
                    status = ?,
                    description = ?
                WHERE id = ? AND user_id = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, name);
            statement.setString(2, category);
            statement.setDouble(3, targetHours);
            statement.setDate(4, deadline);
            statement.setDate(5, startDate);
            statement.setString(6, priority);
            statement.setString(7, status);
            statement.setString(8, description);
            statement.setString(9, goalId);
            statement.setString(10, userId);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to update goal", e);
        }
    }

    /** Immutable query result used by goal and step servlets. */
    public static class GoalData {

        private final String id;
        private final String userId;
        private final String name;
        private final String category;
        private final double targetHours;
        private final Date deadline;
        private final Date startDate;
        private final String priority;
        private final String status;
        private final String description;
        private final int totalLoggedMinutes;

        /**
         * Creates a goal result from one database row.
         *
         * @param id goal id
         * @param userId owner id
         * @param name goal name
         * @param category goal category
         * @param targetHours target hours
         * @param deadline deadline
         * @param startDate start date
         * @param priority priority
         * @param status current status
         * @param description description
         * @param totalLoggedMinutes accumulated tracked minutes
         */
        public GoalData(
                String id,
                String userId,
                String name,
                String category,
                double targetHours,
                Date deadline,
                Date startDate,
                String priority,
                String status,
                String description,
                int totalLoggedMinutes) {

            this.id = id;
            this.userId = userId;
            this.name = name;
            this.category = category;
            this.targetHours = targetHours;
            this.deadline = deadline;
            this.startDate = startDate;
            this.priority = priority;
            this.status = status;
            this.description = description;
            this.totalLoggedMinutes = totalLoggedMinutes;
        }

        /**
         * Returns the goal identifier.
         *
         * @return the goal identifier
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
         * Returns the goal name.
         *
         * @return the goal name
         */
        public String getName() {
            return name;
        }

        /**
         * Returns the goal category.
         *
         * @return the goal category
         */
        public String getCategory() {
            return category;
        }

        /**
         * Returns the target hours.
         *
         * @return the target hours
         */
        public double getTargetHours() {
            return targetHours;
        }

        /**
         * Returns the goal deadline.
         *
         * @return the goal deadline
         */
        public Date getDeadline() {
            return deadline;
        }

        /**
         * Returns the goal start date.
         *
         * @return the goal start date
         */
        public Date getStartDate() {
            return startDate;
        }

        /**
         * Returns the goal priority.
         *
         * @return the goal priority
         */
        public String getPriority() {
            return priority;
        }

        /**
         * Returns the goal status.
         *
         * @return the goal status
         */
        public String getStatus() {
            return status;
        }

        /**
         * Returns the optional description.
         *
         * @return the optional description
         */
        public String getDescription() {
            return description;
        }

        /**
         * Returns the accumulated tracked minutes.
         *
         * @return the accumulated tracked minutes
         */
        public int getTotalLoggedMinutes() {
            return totalLoggedMinutes;
        }
    }
}
