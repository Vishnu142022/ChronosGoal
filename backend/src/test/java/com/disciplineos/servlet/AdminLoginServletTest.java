package com.disciplineos.servlet;

import com.disciplineos.dao.UsageDAO;
import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;
import org.mindrot.jbcrypt.BCrypt;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.util.Map;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import java.util.logging.Logger;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests administrator password, role, status, and session checks without a database. */
class AdminLoginServletTest {

    @Test
    void unknownEmailLogsOnlyGenericWarning() throws Exception {
        UserDAO users = mock(UserDAO.class);
        AdminLoginServlet servlet = new AdminLoginServlet(users, mock(UsageDAO.class),
                Map.of("ADMIN_EMAIL", "configured-admin@example.test",
                        "ADMIN_PASSWORD", "test-only-passphrase")::get);
        HttpServletRequest request = mockRequest(
                "{\"email\":\"unknown@example.test\",\"password\":\"test-only-passphrase\"}");
        HttpServletResponse response = mockResponse();
        Logger logger = Logger.getLogger(AdminLoginServlet.class.getName());
        CapturingHandler handler = new CapturingHandler();
        logger.addHandler(handler);
        try {
            servlet.doPost(request, response);
        } finally {
            logger.removeHandler(handler);
        }

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        assertTrue(handler.messages.contains(
                "Admin login email does not match a configured account."));
        assertTrue(handler.messages.stream().noneMatch(message ->
                message.contains("unknown@example.test")
                        || message.contains("test-only-passphrase")));
    }

    @Test
    void missingBootstrapVariablesReturnUnauthorizedAndLogWarningWithoutValues()
            throws Exception {
        UserDAO users = mock(UserDAO.class);
        AdminLoginServlet servlet = new AdminLoginServlet(
                users, mock(UsageDAO.class), ignored -> null);
        HttpServletRequest request = mockRequest(
                "{\"email\":\"person@example.com\",\"password\":\"correct-password\"}");
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        Logger logger = Logger.getLogger(AdminLoginServlet.class.getName());
        CapturingHandler handler = new CapturingHandler();
        logger.addHandler(handler);
        try {
            servlet.doPost(request, response);
        } finally {
            logger.removeHandler(handler);
        }

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        assertTrue(body.toString().contains("\"message\":\"Invalid admin credentials\""));
        assertTrue(handler.messages.stream().anyMatch(message ->
                message.equals("Admin bootstrap variables are not configured.")));
        assertTrue(handler.messages.stream().noneMatch(message ->
                message.contains("person@example.com")
                        || message.contains("correct-password")));
    }

    @Test
    void configuredBootstrapCredentialsCreateAdminAndSession() throws Exception {
        UserDAO users = mock(UserDAO.class);
        UsageDAO usage = mock(UsageDAO.class);
        String email = "configured-admin@example.test";
        String password = "test-only-bootstrap-passphrase";
        UserData createdAdmin = new UserData("admin-1", "Administrator", email,
                BCrypt.hashpw(password, BCrypt.gensalt(4)), "ADMIN", "ACTIVE");
        when(users.getUserByEmail(email)).thenReturn(null, createdAdmin);
        when(users.createAdminUser(anyString(), eq("Administrator"), eq(email),
                argThat(hash -> BCrypt.checkpw(password, hash)))).thenReturn(true);
        HttpServletRequest request = mockRequest(
                "{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}");
        HttpServletResponse response = mock(HttpServletResponse.class);
        StringWriter body = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(true)).thenReturn(session);
        AdminLoginServlet servlet = new AdminLoginServlet(users, usage, Map.of(
                "ADMIN_EMAIL", email,
                "ADMIN_PASSWORD", password)::get);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_OK);
        verify(users).createAdminUser(anyString(), eq("Administrator"), eq(email),
                argThat(hash -> BCrypt.checkpw(password, hash)));
        verify(request).changeSessionId();
        verify(session).setAttribute("userId", "admin-1");
        verify(session).setAttribute("userRole", "ADMIN");
        assertTrue(body.toString().contains("\"success\":true"));
    }

    @Test
    void rejectsExistingAdminWithWrongPassword() throws Exception {
        UserDAO users = mock(UserDAO.class);
        AdminLoginServlet servlet = new AdminLoginServlet(
                users, mock(UsageDAO.class), ignored -> null);
        HttpServletRequest request = mockRequest(
                "{\"email\":\"person@example.com\",\"password\":\"wrong-password\"}");
        HttpServletResponse response = mockResponse();
        when(users.getUserByEmail("person@example.com")).thenReturn(
                new UserData("admin-1", "Person", "person@example.com",
                        BCrypt.hashpw("actual-password", BCrypt.gensalt(4)),
                        "ADMIN", "ACTIVE"));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(users, never()).createAdminUser(anyString(), anyString(),
                anyString(), anyString());
        verify(request, never()).getSession(true);
    }

    @Test
    void rejectsValidPasswordForNonAdminAccount() throws Exception {
        UserDAO users = mock(UserDAO.class);
        AdminLoginServlet servlet = new AdminLoginServlet(users, mock(UsageDAO.class));
        HttpServletRequest request = mockRequest();
        HttpServletResponse response = mockResponse();
        when(users.getUserByEmail("person@example.com")).thenReturn(
                new UserData("user-1", "Person", "person@example.com",
                        BCrypt.hashpw("correct-password", BCrypt.gensalt(4)), "USER", "ACTIVE"));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(request, never()).getSession(true);
    }

    @Test
    void rejectsInactiveAdministratorEvenWithCorrectPassword() throws Exception {
        UserDAO users = mock(UserDAO.class);
        AdminLoginServlet servlet = new AdminLoginServlet(users, mock(UsageDAO.class));
        HttpServletRequest request = mockRequest();
        HttpServletResponse response = mockResponse();
        when(users.getUserByEmail("person@example.com")).thenReturn(
                new UserData("admin-1", "Person", "person@example.com",
                        BCrypt.hashpw("correct-password", BCrypt.gensalt(4)), "ADMIN", "SUSPENDED"));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(request, never()).getSession(true);
    }

    @Test
    void doesNotPromoteUserAccountAtConfiguredAdminEmail() throws Exception {
        UserDAO users = mock(UserDAO.class);
        String email = "configured-admin@example.test";
        AdminLoginServlet servlet = new AdminLoginServlet(users, mock(UsageDAO.class),
                Map.of("ADMIN_EMAIL", email, "ADMIN_PASSWORD", "test-only-passphrase")::get);
        HttpServletRequest request = mockRequest(
                "{\"email\":\"" + email + "\",\"password\":\"test-only-passphrase\"}");
        HttpServletResponse response = mockResponse();
        when(users.getUserByEmail(email)).thenReturn(new UserData(
                "user-1", "Person", email,
                BCrypt.hashpw("test-only-passphrase", BCrypt.gensalt(4)),
                "USER", "ACTIVE"));

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        verify(users, never()).createAdminUser(anyString(), anyString(),
                anyString(), anyString());
        verify(users, never()).updateActiveAdminPasswordHash(anyString(), anyString());
        verify(request, never()).getSession(true);
    }

    @Test
    void createsSessionForActiveAdministratorWithValidPassword() throws Exception {
        UserDAO users = mock(UserDAO.class);
        UsageDAO usage = mock(UsageDAO.class);
        AdminLoginServlet servlet = new AdminLoginServlet(users, usage);
        HttpServletRequest request = mockRequest();
        HttpServletResponse response = mockResponse();
        StringWriter body = new StringWriter();
        HttpSession session = mock(HttpSession.class);
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        when(users.getUserByEmail("person@example.com")).thenReturn(
                new UserData("admin-1", "Person", "person@example.com",
                        BCrypt.hashpw("correct-password", BCrypt.gensalt(4)), "ADMIN", "ACTIVE"));
        when(request.getSession(true)).thenReturn(session);

        servlet.doPost(request, response);

        verify(response).setStatus(HttpServletResponse.SC_OK);
        verify(request).changeSessionId();
        verify(session).setAttribute("userId", "admin-1");
        verify(session).setAttribute("userRole", "ADMIN");
        verify(usage).recordEvent(org.mockito.ArgumentMatchers.eq("admin-1"),
                org.mockito.ArgumentMatchers.eq("AUTH"),
                org.mockito.ArgumentMatchers.eq("ADMIN_LOGIN"),
                org.mockito.ArgumentMatchers.anyLong());
        assertTrue(body.toString().contains("\"role\":\"ADMIN\""));
    }

    private HttpServletRequest mockRequest() throws Exception {
        return mockRequest(
                "{\"email\":\"person@example.com\",\"password\":\"correct-password\"}");
    }

    private HttpServletRequest mockRequest(String json) throws Exception {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getReader()).thenReturn(new BufferedReader(new StringReader(json)));
        return request;
    }

    private HttpServletResponse mockResponse() throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        return response;
    }

    private static final class CapturingHandler extends Handler {
        private final java.util.List<String> messages = new java.util.ArrayList<>();

        @Override
        public void publish(LogRecord record) {
            messages.add(record.getMessage());
        }

        @Override
        public void flush() { }

        @Override
        public void close() { }
    }
}

