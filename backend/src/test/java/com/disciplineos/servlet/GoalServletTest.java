package com.disciplineos.servlet;

import com.disciplineos.dao.GoalDAO;
import com.disciplineos.dao.GoalDAO.GoalData;
import com.disciplineos.dao.GoalStepDAO;
import com.disciplineos.dao.UsageDAO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.sql.Date;
import java.io.BufferedReader;
import java.io.StringReader;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Servlet-level tests for JSON goal progress output. */
class GoalServletTest {

    @Test
    void includesProgressPercentCalculatedFromLoggedMinutesAndTarget() throws Exception {
        GoalDAO goalDAO = mock(GoalDAO.class);
        GoalStepDAO goalSteps = mock(GoalStepDAO.class);
        GoalServlet servlet = new GoalServlet(goalDAO, mock(UsageDAO.class), goalSteps);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(goalDAO.getGoalsByUser("user-1")).thenReturn(List.of(new GoalData(
                "goal-1", "user-1", "Learn Java", "Career", 2.0,
                Date.valueOf("2026-12-31"), Date.valueOf("2026-01-01"),
                "MEDIUM", "IN_PROGRESS", "", 60)));
        when(goalSteps.getStepsByGoalId("goal-1")).thenReturn(List.of(
                new GoalStepDAO.StepData("step-1", "goal-1", "Read chapter",
                        null, false, null, 0)));

        servlet.doGet(request, response);

        assertTrue(body.toString().contains("\"progressPercent\":50"));
        assertTrue(body.toString().contains("\"steps\":[{\"id\":\"step-1\""));
        assertTrue(body.toString().contains("\"title\":\"Read chapter\""));
    }

    @Test
    void rejectsUnauthenticatedGoalRequests() throws Exception {
        GoalServlet servlet = new GoalServlet(
                mock(GoalDAO.class), mock(UsageDAO.class), mock(GoalStepDAO.class));
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = response(new StringWriter());

        servlet.doGet(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void rejectsGoalCreationWithNonPositiveTarget() throws Exception {
        GoalDAO goals = mock(GoalDAO.class);
        GoalServlet servlet = new GoalServlet(
                goals, mock(UsageDAO.class), mock(GoalStepDAO.class));
        HttpServletRequest request = authenticatedRequest(
                "{\"name\":\"Learn Java\",\"category\":\"Career\",\"targetHours\":-1,"
                        + "\"deadline\":\"2026-12-31\",\"startDate\":\"2026-01-01\"}");
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(goals, org.mockito.Mockito.never()).createGoal(anyString(), anyString(),
                anyString(), anyDouble(), any(), any(), anyString(), anyString());
    }

    @Test
    void createsValidGoalAndReturnsCreatedGoal() throws Exception {
        GoalDAO goals = mock(GoalDAO.class);
        UsageDAO usage = mock(UsageDAO.class);
        GoalServlet servlet = new GoalServlet(goals, usage, mock(GoalStepDAO.class));
        GoalData created = new GoalData("goal-1", "user-1", "Learn Java", "Career", 2.0,
                Date.valueOf("2026-12-31"), Date.valueOf("2026-01-01"),
                "MEDIUM", "NOT_STARTED", "", 0);
        HttpServletRequest request = authenticatedRequest(
                "{\"name\":\"Learn Java\",\"category\":\"Career\",\"targetHours\":2,"
                        + "\"deadline\":\"2026-12-31\",\"startDate\":\"2026-01-01\"}");
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);
        when(goals.createGoal(eq("user-1"), anyString(), anyString(), eq(2.0),
                any(), any(), anyString(), any())).thenReturn("goal-1");
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(created);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_CREATED);
        assertTrue(body.toString().contains("\"progressPercent\":0"));
    }

    private HttpServletRequest authenticatedRequest(String body) throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(body)));
        return request;
    }

    private HttpServletResponse response(StringWriter body) throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        return response;
    }
}

