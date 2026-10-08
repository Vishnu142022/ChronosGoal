package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests goal-step SQL ownership, toggling, deletion, and ordering without MySQL. */
class GoalStepDAOTest {

    @Test
    void ordersStepsByOrderAndStableIdTieBreaker() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);
        when(rows.next()).thenReturn(false);

        try (MockedStatic<DBConnection> db = mockStatic(DBConnection.class)) {
            db.when(DBConnection::getConnection).thenReturn(connection);

            List<GoalStepDAO.StepData> result =
                    new GoalStepDAO().getStepsByGoalId("goal-1");

            assertTrue(result.isEmpty());
            ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
            verify(connection).prepareStatement(sql.capture());
            assertTrue(sql.getValue().contains("ORDER BY step_order ASC, id ASC"));
        }
    }

    @Test
    void completionUpdateCanToggleBothDirections() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeUpdate()).thenReturn(1, 1);

        try (MockedStatic<DBConnection> db = mockStatic(DBConnection.class)) {
            db.when(DBConnection::getConnection).thenReturn(connection);
            GoalStepDAO dao = new GoalStepDAO();

            assertTrue(dao.toggleStep("step-1", "user-1"));
            assertTrue(dao.toggleStep("step-1", "user-1"));

            ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
            verify(connection, times(2)).prepareStatement(sql.capture());
            assertTrue(sql.getAllValues().get(0).contains("NOT gs.completed"));
            assertTrue(sql.getAllValues().get(0).contains("gs.completed = false"));
            assertTrue(sql.getAllValues().get(0).contains("g.user_id = ?"));
            verify(statement, times(2)).executeUpdate();
        }
    }

    @Test
    void deletionIsScopedToGoalStepAndAuthenticatedOwner() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeUpdate()).thenReturn(1);

        try (MockedStatic<DBConnection> db = mockStatic(DBConnection.class)) {
            db.when(DBConnection::getConnection).thenReturn(connection);

            assertTrue(new GoalStepDAO().deleteStep("goal-1", "step-1", "user-1"));

            ArgumentCaptor<String> sql = ArgumentCaptor.forClass(String.class);
            verify(connection).prepareStatement(sql.capture());
            assertTrue(sql.getValue().contains("g.user_id = ?"));
            verify(statement).setString(1, "goal-1");
            verify(statement).setString(2, "step-1");
            verify(statement).setString(3, "user-1");
        }
    }
}

