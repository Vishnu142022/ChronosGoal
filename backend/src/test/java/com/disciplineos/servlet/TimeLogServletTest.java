package com.disciplineos.servlet;

import com.disciplineos.dao.TimeLogDAO;
import com.disciplineos.dao.UsageDAO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Tests JSON time-log updates and input validation without a database. */
class TimeLogServletTest {

    private TimeLogDAO logs;
    private TimeLogServlet servlet;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        logs = mock(TimeLogDAO.class);
        servlet = new TimeLogServlet(logs, mock(UsageDAO.class));
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
    }

    @Test
    void updatesTimeLogFromJsonBody() throws Exception {
        when(request.getParameter("id")).thenReturn("log-1");
        reader(validUpdateBody());
        when(logs.updateTimeLog(eq("log-1"), eq("user-1"), eq("goal-1"),
                any(), eq("09:00"), eq("10:00"), eq(60), eq("focused"), eq(4)))
                .thenReturn(true);
        when(logs.getTimeLogById("log-1", "user-1")).thenReturn(
                new TimeLogDAO.TimeLogData("log-1", "user-1", "goal-1",
                        java.sql.Date.valueOf("2026-05-01"), "09:00", "10:00",
                        60, "focused", 4, null, "Learn Java"));

        servlet.doPut(request, response);

        verify(logs).updateTimeLog(eq("log-1"), eq("user-1"), eq("goal-1"),
                any(), eq("09:00"), eq("10:00"), eq(60), eq("focused"), eq(4));
        assertTrue(responseBody.toString().contains("\"id\":\"log-1\""));
    }

    @Test
    void rejectsInvalidJsonForTimeLogUpdate() throws Exception {
        when(request.getParameter("id")).thenReturn("log-1");
        reader("{not-json");

        servlet.doPut(request, response);

        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(logs, never()).updateTimeLog(anyString(), anyString(), anyString(),
                any(), anyString(), anyString(), anyInt(), any(), any());
    }

    @Test
    void rejectsPostWhenEndTimePrecedesStartTime() throws Exception {
        when(request.getParameter("goalId")).thenReturn("goal-1");
        when(request.getParameter("logDate")).thenReturn("2026-05-01");
        when(request.getParameter("startTime")).thenReturn("10:00");
        when(request.getParameter("endTime")).thenReturn("09:00");
        when(request.getParameter("durationMinutes")).thenReturn("60");

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        assertTrue(responseBody.toString().contains("End time must be later"));
        verify(logs, never()).createTimeLog(anyString(), anyString(), any(),
                anyString(), anyString(), anyInt(), any(), any());
    }

    private void reader(String content) throws Exception {
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(content)));
    }

    private String validUpdateBody() {
        return "{\"goalId\":\"goal-1\",\"logDate\":\"2026-05-01\","
                + "\"startTime\":\"09:00\",\"endTime\":\"10:00\","
                + "\"durationMinutes\":60,\"notes\":\"focused\","
                + "\"productivityRating\":4}";
    }
}

