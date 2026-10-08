package com.disciplineos.servlet;

import com.disciplineos.dao.HabitDAO;
import com.disciplineos.dao.HabitDAO.HabitData;
import com.disciplineos.dao.HabitDAO.HabitInput;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Tests habit CRUD and session ownership at the servlet boundary. */
class HabitServletTest {

    private HabitDAO habits;
    private HabitServlet servlet;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        habits = mock(HabitDAO.class);
        servlet = new HabitServlet(habits);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
    }

    @Test
    void rejectsUnauthenticatedHabitListing() throws Exception {
        servlet.doGet(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(habits, never()).list(anyString());
    }

    @Test
    void listsHabitsForSessionUser() throws Exception {
        authenticate();
        when(habits.list("user-1")).thenReturn(List.of());

        servlet.doGet(request, response);

        verify(habits).list("user-1");
        verify(response).setStatus(HttpServletResponse.SC_OK);
        assertTrue(responseBody.toString().contains("[]"));
    }

    @Test
    void createsHabitForSessionUser() throws Exception {
        authenticate();
        reader("{\"name\":\"Read daily\"}");
        when(habits.create(eq("user-1"), any(HabitInput.class))).thenReturn(habit());

        servlet.doPost(request, response);

        verify(habits).create(eq("user-1"), any(HabitInput.class));
        verify(response).setStatus(HttpServletResponse.SC_CREATED);
        assertTrue(responseBody.toString().contains("\"name\":\"Read daily\""));
    }

    @Test
    void updatesOwnedHabit() throws Exception {
        authenticate();
        when(request.getPathInfo()).thenReturn("/habit-1");
        reader("{\"name\":\"Read daily\",\"frequency\":\"DAILY\"}");
        when(habits.update(eq("user-1"), eq("habit-1"), any(HabitInput.class)))
                .thenReturn(habit());

        servlet.doPut(request, response);

        verify(habits).update(eq("user-1"), eq("habit-1"), any(HabitInput.class));
        verify(response).setStatus(HttpServletResponse.SC_OK);
    }

    @Test
    void deletesOwnedHabit() throws Exception {
        authenticate();
        when(request.getPathInfo()).thenReturn("/habit-1");
        when(habits.delete("user-1", "habit-1")).thenReturn(true);

        servlet.doDelete(request, response);

        verify(habits).delete("user-1", "habit-1");
        verify(response).setStatus(HttpServletResponse.SC_OK);
    }

    private void authenticate() {
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
    }

    private void reader(String value) throws Exception {
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(value)));
    }

    private HabitData habit() {
        return new HabitData("habit-1", "user-1", "Read daily", null,
                "General", "#A855F7", "DAILY", null, null, null,
                null, null, null, null, Map.of());
    }
}

