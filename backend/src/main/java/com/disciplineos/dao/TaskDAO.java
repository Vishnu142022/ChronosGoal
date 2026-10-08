package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Persists tasks owned by authenticated users.
 * TaskServlet supplies the owner from the HTTP session; caller-provided owner ids are never used.
 */
public class TaskDAO {

    /** Creates a task data-access object. */
    public TaskDAO() { }

    /**
     * Creates a task for a session owner.
     *
     * @param userId authenticated owner id
     * @param title task title
     * @param description optional task details
     * @param priority task priority
     * @param category task category
     * @param dueDate optional due date
     * @return inserted task data
     * @throws DataAccessException if the database insert or lookup fails
     */
    public TaskData create(String userId, String title, String description, String priority,
                           String category, Date dueDate) {
        String id = "task_" + UUID.randomUUID().toString().replace("-", "");
        String sql = """
                INSERT INTO tasks (id, user_id, title, description, priority, category, due_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, id);
            statement.setString(2, userId);
            statement.setString(3, title);
            statement.setString(4, description);
            statement.setString(5, priority);
            statement.setString(6, category);
            statement.setDate(7, dueDate);
            statement.executeUpdate();
            return findById(connection, userId, id);
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to create task", exception);
        }
    }

    /**
     * Lists the tasks owned by one user.
     *
     * @param userId authenticated owner id
     * @return tasks ordered by due date and creation time
     * @throws DataAccessException if the database query fails
     */
    public List<TaskData> list(String userId) {
        String sql = """
                SELECT id, user_id, title, description, priority, category, due_date,
                       completed, completed_at, created_at
                FROM tasks WHERE user_id = ? ORDER BY due_date IS NULL, due_date, created_at DESC
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            try (ResultSet result = statement.executeQuery()) {
                List<TaskData> tasks = new ArrayList<>();
                while (result.next()) {
                    tasks.add(map(result));
                }
                return tasks;
            }
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to load tasks", exception);
        }
    }

    /**
     * Updates editable task fields only when the task belongs to the session owner.
     *
     * @param userId authenticated owner id
     * @param id task id
     * @param title task title
     * @param description optional details
     * @param priority task priority
     * @param category task category
     * @param dueDate optional due date
     * @return updated task, or {@code null} when not found
     * @throws DataAccessException if the database update or lookup fails
     */
    public TaskData update(String userId, String id, String title, String description,
                           String priority, String category, Date dueDate) {
        String sql = """
                UPDATE tasks SET title = ?, description = ?, priority = ?, category = ?, due_date = ?
                WHERE id = ? AND user_id = ?
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, title);
            statement.setString(2, description);
            statement.setString(3, priority);
            statement.setString(4, category);
            statement.setDate(5, dueDate);
            statement.setString(6, id);
            statement.setString(7, userId);
            return statement.executeUpdate() == 0 ? null : findById(connection, userId, id);
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to update task", exception);
        }
    }

    /**
     * Changes completion status for an owned task.
     *
     * @param userId authenticated owner id
     * @param id task id
     * @return updated task, or {@code null} when not found
     * @throws DataAccessException if the database update or lookup fails
     */
    public TaskData toggle(String userId, String id) {
        String sql = """
                UPDATE tasks SET completed = NOT completed,
                    completed_at = IF(completed, NULL, CURRENT_TIMESTAMP)
                WHERE id = ? AND user_id = ?
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, id);
            statement.setString(2, userId);
            return statement.executeUpdate() == 0 ? null : findById(connection, userId, id);
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to toggle task", exception);
        }
    }

    /**
     * Deletes an owned task.
     *
     * @param userId authenticated owner id
     * @param id task id
     * @return whether one task was deleted
     * @throws DataAccessException if the database delete fails
     */
    public boolean delete(String userId, String id) {
        String sql = "DELETE FROM tasks WHERE id = ? AND user_id = ?";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, id);
            statement.setString(2, userId);
            return statement.executeUpdate() > 0;
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to delete task", exception);
        }
    }

    private TaskData findById(Connection connection, String userId, String id) throws SQLException {
        String sql = """
                SELECT id, user_id, title, description, priority, category, due_date,
                       completed, completed_at, created_at FROM tasks WHERE user_id = ? AND id = ?
                """;
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            statement.setString(2, id);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? map(result) : null;
            }
        }
    }

    private TaskData map(ResultSet result) throws SQLException {
        return new TaskData(result.getString("id"), result.getString("user_id"),
                result.getString("title"), result.getString("description"),
                result.getString("priority"), result.getString("category"),
                result.getDate("due_date"), result.getBoolean("completed"),
                result.getTimestamp("completed_at"), result.getTimestamp("created_at"));
    }

    /**
     * Database representation of a task, using JDBC date types for ISO serialization in the servlet.
     *
     * @param id task identifier
     * @param userId authenticated owner identifier
     * @param title task title
     * @param description optional details
     * @param priority priority label
     * @param category task category
     * @param dueDate optional deadline
     * @param completed completion flag
     * @param completedAt completion timestamp
     * @param createdAt creation timestamp
     */
    public record TaskData(String id, String userId, String title, String description, String priority,
                           String category, Date dueDate, boolean completed, Timestamp completedAt,
                           Timestamp createdAt) { }
}

