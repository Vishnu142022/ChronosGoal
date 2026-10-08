package com.disciplineos.servlet;

import com.disciplineos.dao.UsageDAO;
import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import java.io.BufferedReader;
import java.io.StringReader;
import java.io.StringWriter;
import java.io.PrintWriter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests login request status codes and successful server-session setup. */
class LoginServletTest {

    private UserDAO userDAO;
    private UsageDAO usageDAO;
    private LoginServlet servlet;
    private HttpServletRequest request;
    private HttpServletResponse response;
    private StringWriter responseBody;

    @BeforeEach
    void setUp() throws Exception {
        userDAO = mock(UserDAO.class);
        usageDAO = mock(UsageDAO.class);
        servlet = new LoginServlet(userDAO, usageDAO);
        request = mock(HttpServletRequest.class);
        response = mock(HttpServletResponse.class);
        responseBody = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(responseBody));
    }

    @Test
    void returnsBadRequestWhenLoginFieldsAreMissing() throws Exception {
        when(request.getReader()).thenReturn(reader("{\"email\":\"\"}"));
        servlet.doPost(request, response);
        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(userDAO, never()).getUserByEmail(anyString());
    }

    @Test
    void returnsBadRequestForMalformedLoginJson() throws Exception {
        when(request.getReader()).thenReturn(reader("{invalid"));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_BAD_REQUEST);
        verify(userDAO, never()).getUserByEmail(anyString());
    }

    @Test
    void returnsUnauthorizedWhenPasswordIsWrong() throws Exception {
        when(request.getReader()).thenReturn(reader(
                "{\"email\":\"person@example.com\",\"password\":\"wrong-password\"}"));
        when(userDAO.getUserByEmail("person@example.com")).thenReturn(
                new UserData("user-1", "Person", "person@example.com",
                        BCrypt.hashpw("right-password", BCrypt.gensalt(4)), "USER", "ACTIVE"));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        assertTrue(responseBody.toString().contains("Invalid email or password"));
    }

    @Test
    void returnsSuccessAndSetsSessionAttributesForValidLogin() throws Exception {
        HttpSession session = mock(HttpSession.class);
        when(request.getReader()).thenReturn(reader(
                "{\"email\":\"person@example.com\",\"password\":\"right-password\"}"));
        when(userDAO.getUserByEmail("person@example.com")).thenReturn(
                new UserData("user-1", "Person", "person@example.com",
                        BCrypt.hashpw("right-password", BCrypt.gensalt(4)), "USER", "ACTIVE"));
        when(request.getSession(true)).thenReturn(session);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_OK);
        verify(session).setAttribute("userId", "user-1");
        verify(session).setAttribute("userName", "Person");
        verify(session).setAttribute("userEmail", "person@example.com");
        verify(session).setAttribute("userRole", "USER");
        verify(request).changeSessionId();
        assertTrue(responseBody.toString().contains("\"success\":true"));
    }

    private BufferedReader reader(String body) {
        return new BufferedReader(new StringReader(body));
    }
}

