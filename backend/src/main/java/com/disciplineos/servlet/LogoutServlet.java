package com.disciplineos.servlet;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.Map;

/**
 * Invalidates the current authenticated session.
 * The frontend calls {@code POST /api/logout} before clearing its client state.
 */
@WebServlet("/api/logout")
public class LogoutServlet extends ApiServlet {

    /** Creates the logout servlet. */
    public LogoutServlet() { }

    /**
     * Handles {@code POST /api/logout}.
     *
     * @param request current servlet request
     * @param response JSON logout confirmation
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        HttpSession session = request.getSession(false);

        if (session != null) {
            session.invalidate();
        }

        sendJson(response, HttpServletResponse.SC_OK,
                Map.of("success", true, "message", "Logout successful"));
    }
}
