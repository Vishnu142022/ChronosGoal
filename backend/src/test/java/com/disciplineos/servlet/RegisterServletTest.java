package com.disciplineos.servlet;

import com.disciplineos.dao.UsageDAO;
import com.disciplineos.dao.UserDAO;
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
import static org.mockito.Mockito.*;

/** Tests registration validation, duplicate handling, and session establishment. */
class RegisterServletTest {

    private UserDAO users;
    private RegisterServlet servlet;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        users = mock(UserDAO.class);
        servlet = new RegisterServlet(users, mock(UsageDAO.class));
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
    }

    @Test
    void returnsBadRequestWhenRequiredFieldsAreMissing() throws Exception {
        body("{\"email\":\"person@example.com\",\"password\":\"longpassword\"}");

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(users, never()).createUser(anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void returnsBadRequestWhenPasswordsDoNotMatch() throws Exception {
        body("{\"name\":\"Person\",\"email\":\"person@example.com\","
                + "\"password\":\"longpassword\",\"confirmPassword\":\"different\"}");

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(users, never()).userExists(anyString());
    }

    @Test
    void returnsConflictForDuplicateEmail() throws Exception {
        body(validBody());
        when(users.userExists("person@example.com")).thenReturn(true);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_CONFLICT);
        assertTrue(responseBody.toString().contains("Email already registered"));
    }

    @Test
    void returnsCreatedAndEstablishesSessionOnSuccessfulRegistration() throws Exception {
        HttpSession session = mock(HttpSession.class);
        body(validBody());
        when(users.userExists("person@example.com")).thenReturn(false);
        when(users.createUser(anyString(), eq("Person"), eq("person@example.com"), anyString()))
                .thenReturn(true);
        when(request.getSession(true)).thenReturn(session);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_CREATED);
        verify(request).changeSessionId();
        verify(session).setAttribute("userRole", "USER");
        verify(session).setAttribute("userEmail", "person@example.com");
        assertTrue(responseBody.toString().contains("\"success\":true"));
    }

    private void body(String json) throws Exception {
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(json)));
    }

    private String validBody() {
        return "{\"name\":\"Person\",\"email\":\"person@example.com\","
                + "\"password\":\"longpassword\",\"confirmPassword\":\"longpassword\"}";
    }
}

