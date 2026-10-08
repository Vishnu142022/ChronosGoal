package com.disciplineos.servlet;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Verifies the shared API servlet session and JSON error contracts. */
class ApiServletTest {

    @Test
    void returnsSessionUserIdFromServerSideSession() throws Exception {
        Harness servlet = new Harness();
        HttpServletRequest request = mock(HttpServletRequest.class);
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("session-user");

        assertEquals("session-user", servlet.requireUser(request, response));
    }

    @Test
    void missingSessionUsesStandardMessageErrorShape() throws Exception {
        Harness servlet = new Harness();
        HttpServletRequest request = mock(HttpServletRequest.class);
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);
        when(request.getSession(false)).thenReturn(null);

        assertNull(servlet.requireUser(request, response));
        assertEquals("{\"success\":false,\"message\":\"Authentication required\"}",
                body.toString());
    }

    @Test
    void supportsLegacyEndpointErrorKey() throws Exception {
        Harness servlet = new Harness();
        StringWriter body = new StringWriter();
        HttpServletResponse response = response(body);
        servlet.writeLegacyError(response);
        assertEquals("{\"success\":false,\"error\":\"Invalid time\"}",
                body.toString());
    }

    private HttpServletResponse response(StringWriter body) throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(body));
        return response;
    }

    private static final class Harness extends ApiServlet {
        private String requireUser(
                HttpServletRequest request,
                HttpServletResponse response) throws Exception {
            return requireSessionUserId(request, response);
        }

        private void writeLegacyError(HttpServletResponse response) throws Exception {
            sendError(response, 400, "Invalid time", "error");
        }
    }
}

