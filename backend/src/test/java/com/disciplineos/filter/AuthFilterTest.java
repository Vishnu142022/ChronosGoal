package com.disciplineos.filter;

import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.Test;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Tests session enforcement and public authentication routes in the API filter. */
class AuthFilterTest {

    @Test
    void rejectsProtectedRequestWithoutSession() throws Exception {
        UserDAO userDAO = mock(UserDAO.class);
        AuthFilter filter = new AuthFilter(userDAO);
        HttpServletRequest request = request("/api/goals");
        HttpServletResponse response = response();
        when(request.getSession(false)).thenReturn(null);

        filter.doFilter(request, response, mock(FilterChain.class));

        verify(response).setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    }

    @Test
    void rejectsAndInvalidatesSessionForInactiveAccount() throws Exception {
        UserDAO userDAO = mock(UserDAO.class);
        AuthFilter filter = new AuthFilter(userDAO);
        HttpServletRequest request = request("/api/goals");
        HttpServletResponse response = response();
        HttpSession session = mock(HttpSession.class);
        when(request.getSession(false)).thenReturn(session);
        when(session.getAttribute("userId")).thenReturn("user-1");
        when(userDAO.getUserById("user-1")).thenReturn(
                new UserData("user-1", "Person", "p@example.com", "hash", "USER", "SUSPENDED"));

        filter.doFilter(request, response, mock(FilterChain.class));

        verify(response).setStatus(HttpServletResponse.SC_FORBIDDEN);
        verify(session).invalidate();
    }

    @Test
    void permitsPublicLoginWithoutSession() throws Exception {
        UserDAO userDAO = mock(UserDAO.class);
        AuthFilter filter = new AuthFilter(userDAO);
        HttpServletRequest request = request("/api/login");
        HttpServletResponse response = response();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(request, response, chain);

        verify(chain).doFilter(request, response);
        verify(userDAO, never()).getUserById("user-1");
    }

    private HttpServletRequest request(String uri) {
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn(uri);
        when(request.getContextPath()).thenReturn("");
        return request;
    }

    private HttpServletResponse response() throws Exception {
        HttpServletResponse response = mock(HttpServletResponse.class);
        when(response.getWriter()).thenReturn(new PrintWriter(new StringWriter()));
        return response;
    }
}

