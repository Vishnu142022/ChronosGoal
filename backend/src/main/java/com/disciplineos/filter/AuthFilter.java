package com.disciplineos.filter;

import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;

/**
 * Enforces active server-side sessions for protected API routes.
 * Login, registration, logout, and session-discovery paths are deliberately public.
 */
public class AuthFilter implements Filter {

    private final UserDAO userDAO;

    /** Creates the production filter with its JDBC-backed user lookup. */
    public AuthFilter() {
        this(new UserDAO());
    }

    AuthFilter(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    /**
     * Allows public auth routes and validates the current account before protected APIs.
     *
     * @param request incoming servlet request
     * @param response outgoing servlet response
     * @param chain remaining API filters and servlet
     * @throws IOException when writing a rejection response fails
     * @throws ServletException when the downstream servlet reports a servlet failure
     */
    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpRequest =
                (HttpServletRequest) request;

        HttpServletResponse httpResponse =
                (HttpServletResponse) response;

        String path = httpRequest.getRequestURI()
                .substring(httpRequest.getContextPath().length());

        /*
         * PUBLIC AUTHENTICATION ENDPOINTS
         *
         * These endpoints must be reachable without
         * an authenticated session.
         */
        if ("/api/login".equals(path)
                || "/api/admin-login".equals(path)
                || "/api/register".equals(path)
                || "/api/auth/me".equals(path)
                || "/api/logout".equals(path)) {

            chain.doFilter(request, response);
            return;
        }

        /*
         * All remaining /api/* endpoints require
         * an authenticated server-side session.
         */
        HttpSession session =
                httpRequest.getSession(false);

        if (session == null
                || session.getAttribute("userId") == null) {

            httpResponse.setContentType("application/json");
            httpResponse.setCharacterEncoding("UTF-8");
            httpResponse.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );

            httpResponse.getWriter().write(
                    "{\"success\":false,\"message\":\"Authentication required\"}"
            );

            return;
        }

        UserData user = userDAO.getUserById(
                String.valueOf(session.getAttribute("userId"))
        );
        if (user == null || !"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            session.invalidate();
            httpResponse.setContentType("application/json");
            httpResponse.setCharacterEncoding("UTF-8");
            httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
            httpResponse.getWriter().write(
                    "{\"success\":false,\"message\":\"Account is not active\"}"
            );
            return;
        }
        session.setAttribute("userRole", user.getRole());

        chain.doFilter(request, response);
    }
}
