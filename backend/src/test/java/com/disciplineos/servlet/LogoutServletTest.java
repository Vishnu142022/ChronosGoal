package com.disciplineos.servlet;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests logout's session invalidation behavior. */
class LogoutServletTest {

    @Test
    void invalidatesTheCurrentSession() throws Exception {
        LogoutServlet servlet = new LogoutServlet();
        HttpServletRequest request = mock(HttpServletRequest.class);
        HttpServletResponse response = mock(HttpServletResponse.class);
        HttpSession session = mock(HttpSession.class);
        StringWriter body = new StringWriter();
        when(request.getSession(false)).thenReturn(session);
        when(response.getWriter()).thenReturn(new PrintWriter(body));

        servlet.doPost(request, response);

        verify(session).invalidate();
        verify(response).setStatus(HttpServletResponse.SC_OK);
        assertTrue(body.toString().contains("\"success\":true"));
    }
}

