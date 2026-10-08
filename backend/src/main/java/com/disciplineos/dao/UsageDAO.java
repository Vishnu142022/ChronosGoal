package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Persists lightweight authenticated activity metrics for administrator reports.
 * Servlets call this DAO after user actions; usage failure is logged without rolling back
 * the user operation because metrics are supplementary.
 */
public class UsageDAO {

    private static final Logger LOGGER = Logger.getLogger(UsageDAO.class.getName());

    /** Creates a usage metrics data-access object. */
    public UsageDAO() { }

    /**
     * Records an action and its elapsed duration.
     *
     * @param userId authenticated user identifier, or {@code null} for anonymous actions
     * @param tool feature area that produced the event
     * @param action operation name
     * @param startedAtNanos start time measured with {@link System#nanoTime()}
     */
    public void recordEvent(String userId, String tool, String action, long startedAtNanos) {
        String sql = """
                INSERT INTO usage_events (user_id, tool, action, duration_ms)
                VALUES (?, ?, ?, ?)
                """;
        long durationMs = Math.max(0, (System.nanoTime() - startedAtNanos) / 1_000_000);

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            statement.setString(2, tool);
            statement.setString(3, action);
            statement.setLong(4, durationMs);
            statement.executeUpdate();
        } catch (SQLException exception) {
            LOGGER.log(Level.WARNING, "Unable to record usage event " + tool + "/" + action,
                    exception);
        }
    }
}

