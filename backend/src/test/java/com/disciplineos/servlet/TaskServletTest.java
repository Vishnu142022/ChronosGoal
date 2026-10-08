package com.disciplineos.servlet;

import com.disciplineos.dao.TaskDAO;
import com.disciplineos.dao.TaskDAO.TaskData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.sql.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

/** Tests task CRUD and session ownership at the servlet boundary. */
class TaskServletTest {

    private TaskDAO tasks;
    private TaskServlet servlet;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        tasks = mock(TaskDAO.class);
        servlet = new TaskServlet(tasks);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
    }

    @Test
    void rejectsUnauthenticatedTaskListing() throws Exception {
        servlet.doGet(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(tasks, never()).list(anyString());
    }

    @Test
    void listsTasksForSessionUser() throws Exception {
        authenticate("user-7");
        when(tasks.list("user-7")).thenReturn(List.of());

        servlet.doGet(request, response);

        verify(tasks).list("user-7");
        verify(response).setStatus(HttpServletResponse.SC_OK);
        assertTrue(responseBody.toString().contains("[]"));
    }

    @Test
    void createsTaskForSessionUser() throws Exception {
        authenticate("user-7");
        reader("{\"title\":\"Read\",\"description\":\"Chapter 1\"}");
        when(tasks.create(eq("user-7"), eq("Read"), eq("Chapter 1"),
                eq("MEDIUM"), eq("General"), isNull())).thenReturn(task());

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_CREATED);
        verify(tasks).create(eq("user-7"), eq("Read"), eq("Chapter 1"),
                eq("MEDIUM"), eq("General"), isNull());
        assertTrue(responseBody.toString().contains("\"title\":\"Read\""));
    }

    @Test
    void updatesOwnedTask() throws Exception {
        authenticate("user-7");
        when(request.getPathInfo()).thenReturn("/task-1");
        reader("{\"title\":\"Updated\",\"description\":\"Details\"}");
        when(tasks.update(eq("user-7"), eq("task-1"), eq("Updated"), eq("Details"),
                eq("MEDIUM"), eq("General"), isNull())).thenReturn(task());

        servlet.doPut(request, response);

        verify(response).setStatus(HttpServletResponse.SC_OK);
        verify(tasks).update(eq("user-7"), eq("task-1"), eq("Updated"), eq("Details"),
                eq("MEDIUM"), eq("General"), isNull());
    }

    @Test
    void deletesOwnedTask() throws Exception {
        authenticate("user-7");
        when(request.getPathInfo()).thenReturn("/task-1");
        when(tasks.delete("user-7", "task-1")).thenReturn(true);

        servlet.doDelete(request, response);

        verify(tasks).delete("user-7", "task-1");
        verify(response).setStatus(HttpServletResponse.SC_OK);
    }

    private void authenticate(String userId) {
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn(userId);
    }

    private void reader(String value) throws Exception {
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(value)));
    }

    private TaskData task() {
        return new TaskData("task-1", "user-7", "Read", "Chapter 1",
                "MEDIUM", "General", Date.valueOf("2026-12-01"),
                false, null, null);
    }
}

