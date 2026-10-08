package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests time-log persistence transaction behavior without a live MySQL server. */
class TimeLogDAOTest {

    @Test
    void insertsAfterLockingOwnedGoalWithoutSelectingFromGoalsInTriggerStatement()
            throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement ownership = mock(PreparedStatement.class);
        PreparedStatement insert = mock(PreparedStatement.class);
        PreparedStatement load = mock(PreparedStatement.class);
        ResultSet ownedGoal = mock(ResultSet.class);
        ResultSet loadedLog = timeLogRow();
        when(connection.prepareStatement(anyString())).thenReturn(ownership, insert, load);
        when(ownership.executeQuery()).thenReturn(ownedGoal);
        when(ownedGoal.next()).thenReturn(true);
        when(insert.executeUpdate()).thenReturn(1);
        when(load.executeQuery()).thenReturn(loadedLog);
        when(loadedLog.next()).thenReturn(true);

        try (MockedStatic<DBConnection> db = mockStatic(DBConnection.class)) {
            db.when(DBConnection::getConnection).thenReturn(connection);

            TimeLogDAO.TimeLogData created = new TimeLogDAO().createTimeLog(
                    "user-1", "goal-1", Date.valueOf("2026-10-05"),
                    "09:00:00", "10:00:00", 60, "focus", 4);

            assertNotNull(created);
            assertEquals("log-1", created.getId());
            assertEquals(60, created.getDurationMinutes());
            ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
            verify(connection, times(3)).prepareStatement(sql.capture());
            assertTrue(sql.getAllValues().get(0).contains("FOR UPDATE"));
            assertTrue(sql.getAllValues().get(1).contains("VALUES"));
            assertFalse(sql.getAllValues().get(1).toUpperCase().contains("SELECT"));
            assertFalse(sql.getAllValues().get(1).contains("FROM goals"));
            verify(connection).setAutoCommit(false);
            verify(connection).commit();
            verify(connection, never()).rollback();
        }
    }

    @Test
    void rejectsUnownedGoalBeforeAttemptingInsert() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement ownership = mock(PreparedStatement.class);
        ResultSet ownedGoal = mock(ResultSet.class);
        when(connection.prepareStatement(anyString())).thenReturn(ownership);
        when(ownership.executeQuery()).thenReturn(ownedGoal);
        when(ownedGoal.next()).thenReturn(false);

        try (MockedStatic<DBConnection> db = mockStatic(DBConnection.class)) {
            db.when(DBConnection::getConnection).thenReturn(connection);

            assertNull(new TimeLogDAO().createTimeLog(
                    "user-1", "other-goal", Date.valueOf("2026-10-05"),
                    "09:00:00", "10:00:00", 60, null, null));

            verify(connection).rollback();
            verify(connection, never()).commit();
            verify(connection, times(1)).prepareStatement(anyString());
        }
    }

    @Test
    void updatesTimeLogWithoutJoiningGoalsInTriggerStatement() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement ownership = mock(PreparedStatement.class);
        PreparedStatement update = mock(PreparedStatement.class);
        ResultSet ownedGoal = mock(ResultSet.class);
        when(connection.prepareStatement(anyString())).thenReturn(ownership, update);
        when(ownership.executeQuery()).thenReturn(ownedGoal);
        when(ownedGoal.next()).thenReturn(true);
        when(update.executeUpdate()).thenReturn(1);

        try (MockedStatic<DBConnection> db = mockStatic(DBConnection.class)) {
            db.when(DBConnection::getConnection).thenReturn(connection);

            assertTrue(new TimeLogDAO().updateTimeLog(
                    "log-1", "user-1", "goal-1", Date.valueOf("2026-10-05"),
                    "09:00:00", "10:00:00", 60, "focus", 4));

            ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
            verify(connection, times(2)).prepareStatement(sql.capture());
            assertTrue(sql.getAllValues().get(0).contains("FOR UPDATE"));
            assertTrue(sql.getAllValues().get(1).startsWith("UPDATE time_logs"));
            assertFalse(sql.getAllValues().get(1).contains("JOIN goals"));
            verify(connection).commit();
            verify(connection, never()).rollback();
        }
    }

    private ResultSet timeLogRow() throws Exception {
        ResultSet row = mock(ResultSet.class);
        when(row.getString("id")).thenReturn("log-1");
        when(row.getString("user_id")).thenReturn("user-1");
        when(row.getString("goal_id")).thenReturn("goal-1");
        when(row.getDate("log_date")).thenReturn(Date.valueOf("2026-10-05"));
        when(row.getString("start_time")).thenReturn("09:00:00");
        when(row.getString("end_time")).thenReturn("10:00:00");
        when(row.getInt("duration_minutes")).thenReturn(60);
        when(row.getString("notes")).thenReturn("focus");
        when(row.getObject("productivity_rating")).thenReturn(4);
        when(row.getInt("productivity_rating")).thenReturn(4);
        when(row.getTimestamp("created_at")).thenReturn(Timestamp.valueOf("2026-10-05 10:00:00"));
        when(row.getString("goal_name")).thenReturn("Learn Java");
        return row;
    }
}

