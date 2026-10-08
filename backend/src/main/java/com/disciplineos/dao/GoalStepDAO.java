package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persists goal milestones and scopes completion updates through goal ownership.
 * GoalStepServlet checks the owner before calling these prepared-statement operations.
 */
public class GoalStepDAO {

    /** Creates a goal-step data-access object. */
    public GoalStepDAO() { }

    /**
     * Creates an incomplete milestone under an already-authorized goal.
     *
     * @param goalId parent goal
     * @param title milestone title
     * @param deadline optional deadline
     * @param stepOrder display order
     * @return whether the row was created
     */
    public boolean createStep(
            String goalId,
            String title,
            String deadline,
            int stepOrder) {

        String id = "step_" +
                UUID.randomUUID().toString().replace("-", "");

        String sql = """
                INSERT INTO goal_steps
                (id, goal_id, title, deadline, completed, step_order)
                VALUES (?, ?, ?, ?, false, ?)
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, id);
            statement.setString(2, goalId);
            statement.setString(3, title);

            if (deadline == null || deadline.isBlank()) {
                statement.setNull(4, java.sql.Types.DATE);
            } else {
                statement.setDate(
                        4,
                        java.sql.Date.valueOf(deadline)
                );
            }

            statement.setInt(5, stepOrder);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to create goal step", e);
        }
    }

    /**
     * Loads the milestones for a goal in display order.
     *
     * @param goalId parent goal
     * @return ordered milestone records
     */
    public List<StepData> getStepsByGoalId(String goalId) {

        List<StepData> steps = new ArrayList<>();

        String sql = """
                SELECT id, goal_id, title, deadline,
                       completed, completed_at, step_order
                FROM goal_steps
                WHERE goal_id = ?
                ORDER BY step_order ASC, id ASC
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, goalId);

            try (ResultSet resultSet = statement.executeQuery()) {

                while (resultSet.next()) {

                    steps.add(
                            new StepData(
                                    resultSet.getString("id"),
                                    resultSet.getString("goal_id"),
                                    resultSet.getString("title"),
                                    resultSet.getDate("deadline"),
                                    resultSet.getBoolean("completed"),
                                    resultSet.getTimestamp("completed_at"),
                                    resultSet.getInt("step_order")
                            )
                    );
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to load goal steps", e);
        }

        return steps;
    }

    /**
     * Marks a milestone complete only when its parent belongs to the user.
     *
     * @param stepId milestone id
     * @param userId authenticated owner id
     * @return whether a row was updated
     */
    public boolean toggleStep(
            String stepId,
            String userId) {

        String sql = """
                UPDATE goal_steps gs
                INNER JOIN goals g
                    ON gs.goal_id = g.id
                SET gs.completed_at = CASE
                        WHEN gs.completed = false THEN CURRENT_TIMESTAMP
                        ELSE NULL
                    END,
                    gs.completed = NOT gs.completed
                WHERE gs.id = ?
                  AND g.user_id = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement =
                     connection.prepareStatement(sql)) {

            statement.setString(1, stepId);
            statement.setString(2, userId);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to complete goal step", e);
        }
    }

    /**
     * Deletes a milestone only when its parent goal belongs to the user.
     *
     * @param goalId parent goal id
     * @param stepId milestone id
     * @param userId authenticated owner id
     * @return whether a row was deleted
     */
    public boolean deleteStep(String goalId, String stepId, String userId) {
        String sql = """
                DELETE gs
                FROM goal_steps gs
                INNER JOIN goals g ON g.id = gs.goal_id
                WHERE gs.goal_id = ? AND gs.id = ? AND g.user_id = ?
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, goalId);
            statement.setString(2, stepId);
            statement.setString(3, userId);
            return statement.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new DataAccessException("Unable to delete goal step", e);
        }
    }

    /** Immutable query result for a goal milestone. */
    public static class StepData {

        private final String id;
        private final String goalId;
        private final String title;
        private final java.sql.Date deadline;
        private final boolean completed;
        private final java.sql.Timestamp completedAt;
        private final int stepOrder;

        /**
         * Creates a milestone query result.
         *
         * @param id step id
         * @param goalId parent goal id
         * @param title milestone title
         * @param deadline optional deadline
         * @param completed whether it is complete
         * @param completedAt completion timestamp
         * @param stepOrder display order
         */
        public StepData(
                String id,
                String goalId,
                String title,
                java.sql.Date deadline,
                boolean completed,
                java.sql.Timestamp completedAt,
                int stepOrder) {

            this.id = id;
            this.goalId = goalId;
            this.title = title;
            this.deadline = deadline;
            this.completed = completed;
            this.completedAt = completedAt;
            this.stepOrder = stepOrder;
        }

        /**
         * Returns the step identifier.
         *
         * @return the step identifier
         */
        public String getId() {
            return id;
        }

        /**
         * Returns the parent goal identifier.
         *
         * @return the parent goal identifier
         */
        public String getGoalId() {
            return goalId;
        }

        /**
         * Returns the milestone title.
         *
         * @return the milestone title
         */
        public String getTitle() {
            return title;
        }

        /**
         * Returns the optional deadline.
         *
         * @return the optional deadline
         */
        public java.sql.Date getDeadline() {
            return deadline;
        }

        /**
         * Returns whether the step is complete.
         *
         * @return whether the step is complete
         */
        public boolean isCompleted() {
            return completed;
        }

        /**
         * Returns the completion timestamp, if completed.
         *
         * @return the completion timestamp, or {@code null} if incomplete
         */
        public java.sql.Timestamp getCompletedAt() {
            return completedAt;
        }

        /**
         * Returns the display order.
         *
         * @return the display order
         */
        public int getStepOrder() {
            return stepOrder;
        }
    }
}
