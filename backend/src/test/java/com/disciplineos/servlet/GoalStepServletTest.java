package com.disciplineos.servlet;

import com.disciplineos.dao.GoalDAO;
import com.disciplineos.dao.GoalDAO.GoalData;
import com.disciplineos.dao.GoalStepDAO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.sql.Date;
import java.sql.Timestamp;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests goal-step persistence requests and ownership without a database. */
class GoalStepServletTest {

    @Test
    void createsStepOnlyAfterCheckingSessionOwnedGoal() throws Exception {
        GoalStepDAO steps = mock(GoalStepDAO.class);
        GoalDAO goals = mock(GoalDAO.class);
        GoalStepServlet servlet = new GoalStepServlet(steps, goals);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        StringWriter body = new StringWriter();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(request.getPathInfo()).thenReturn("/steps");
        when(request.getParameter("goalId")).thenReturn("goal-1");
        when(request.getParameter("title")).thenReturn("Ship the milestone");
        when(request.getParameter("stepOrder")).thenReturn("2");
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(mock(GoalDAO.GoalData.class));
        when(steps.createStep("goal-1", "Ship the milestone", null, 2)).thenReturn(true);
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        servlet.doPost(request, response);

        verify(steps).createStep("goal-1", "Ship the milestone", null, 2);
        verify(response).setStatus(HttpServletResponse.SC_CREATED);
        assertTrue(body.toString().contains("\"success\":true"));
    }

    @Test
    void doesNotReportSuccessWhenStepInsertReturnsFalse() throws Exception {
        GoalStepDAO steps = mock(GoalStepDAO.class);
        GoalDAO goals = mock(GoalDAO.class);
        GoalStepServlet servlet = new GoalStepServlet(steps, goals);
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        StringWriter body = new StringWriter();
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(request.getPathInfo()).thenReturn("/steps");
        when(request.getParameter("goalId")).thenReturn("goal-1");
        when(request.getParameter("title")).thenReturn("Ship the milestone");
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(mock(GoalDAO.GoalData.class));
        when(steps.createStep("goal-1", "Ship the milestone", null, 0)).thenReturn(false);
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        assertTrue(body.toString().contains("\"success\":false"));
    }

    @Test
    void togglesStepCompletedAndBackToIncompleteAndReturnsStepArray() throws Exception {
        GoalStepDAO steps = mock(GoalStepDAO.class);
        GoalDAO goals = mock(GoalDAO.class);
        GoalStepServlet servlet = new GoalStepServlet(steps, goals);
        GoalData goal = goalData();
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(goal);
        when(steps.toggleStep("step-1", "user-1")).thenReturn(true, true);

        StringWriter completedBody = new StringWriter();
        HttpServletResponse completedResponse = response(completedBody);
        servlet.doPost(ownedRequest("/goal-1/steps/step-1/toggle"), completedResponse);

        StringWriter incompleteBody = new StringWriter();
        HttpServletResponse incompleteResponse = response(incompleteBody);
        servlet.doPost(ownedRequest("/goal-1/steps/step-1/toggle"), incompleteResponse);

        verify(steps, times(2)).toggleStep("step-1", "user-1");
        verify(completedResponse).setStatus(HttpServletResponse.SC_OK);
        verify(incompleteResponse).setStatus(HttpServletResponse.SC_OK);
        assertTrue(incompleteBody.toString().contains("\"steps\":[]"));
    }

    @Test
    void deletesOwnedStep() throws Exception {
        GoalStepDAO steps = mock(GoalStepDAO.class);
        GoalDAO goals = mock(GoalDAO.class);
        GoalStepServlet servlet = new GoalStepServlet(steps, goals);
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(goalData());
        when(steps.deleteStep("goal-1", "step-1", "user-1")).thenReturn(true);
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);

        servlet.doDelete(ownedRequest("/goal-1/steps/step-1"), response);

        verify(steps).deleteStep("goal-1", "step-1", "user-1");
        verify(response).setStatus(HttpServletResponse.SC_OK);
        assertTrue(body.toString().contains("\"success\":true"));
    }

    @Test
    void doesNotAllowAnotherUsersGoalStepToBeToggledOrDeleted() throws Exception {
        GoalStepDAO steps = mock(GoalStepDAO.class);
        GoalDAO goals = mock(GoalDAO.class);
        GoalStepServlet servlet = new GoalStepServlet(steps, goals);
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(null);
        HttpServletResponse toggleResponse = response(new StringWriter());
        HttpServletResponse deleteResponse = response(new StringWriter());

        servlet.doPost(ownedRequest("/goal-1/steps/step-1/toggle"), toggleResponse);
        servlet.doDelete(ownedRequest("/goal-1/steps/step-1"), deleteResponse);

        verify(toggleResponse).setStatus(HttpServletResponse.SC_NOT_FOUND);
        verify(deleteResponse).setStatus(HttpServletResponse.SC_NOT_FOUND);
        verify(steps, never()).toggleStep(anyString(), anyString());
        verify(steps, never()).deleteStep(anyString(), anyString(), anyString());
    }

    @Test
    void stepListResponseKeepsStepOrderAndIncludesPersistedSteps() throws Exception {
        GoalStepDAO steps = mock(GoalStepDAO.class);
        GoalDAO goals = mock(GoalDAO.class);
        GoalStepServlet servlet = new GoalStepServlet(steps, goals);
        when(goals.getGoalById("goal-1", "user-1")).thenReturn(goalData());
        when(steps.getStepsByGoalId("goal-1")).thenReturn(List.of(
                new GoalStepDAO.StepData("step-1", "goal-1", "First", null,
                        false, null, 0),
                new GoalStepDAO.StepData("step-2", "goal-1", "Second",
                        Date.valueOf("2026-12-31"), true,
                        Timestamp.valueOf("2026-10-05 10:00:00"), 1)));
        HttpServletRequest request = ownedRequest("/steps");
        when(request.getParameter("goalId")).thenReturn("goal-1");
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);

        servlet.doGet(request, response);

        assertTrue(body.toString().contains("\"steps\":["));
        assertTrue(body.toString().indexOf("\"title\":\"First\"")
                < body.toString().indexOf("\"title\":\"Second\""));
        assertTrue(body.toString().contains("\"success\":true"));
    }

    private HttpServletRequest ownedRequest(String path) throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(request.getPathInfo()).thenReturn(path);
        return request;
    }

    private HttpServletResponse response(StringWriter body) throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        return response;
    }

    private GoalData goalData() {
        return new GoalData("goal-1", "user-1", "Goal", "Career", 10.0,
                Date.valueOf("2026-12-31"), Date.valueOf("2026-01-01"),
                "MEDIUM", "IN_PROGRESS", "", 0);
    }
}

