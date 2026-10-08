package com.disciplineos.servlet;

import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Returns the active account represented by the current session.
 * The frontend calls {@code GET /api/auth/me} to restore login state after reload.
 */
@WebServlet("/api/auth/me")
public class AuthMeServlet extends ApiServlet {

    /** Repository used to load the account represented by the active session. */
    private final UserDAO userDAO;

    /** Constructs the production servlet with a JDBC-backed DAO. */
    public AuthMeServlet() {
        this(new UserDAO());
    }

    AuthMeServlet(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    /**
     * Handles {@code GET /api/auth/me}.
     *
     * @param request current session request
     * @param response JSON account data or an authentication error
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }

        jakarta.servlet.http.HttpSession session = request.getSession(false);

        UserData user = userDAO.getUserById(userId);

        if (user == null) {

            session.invalidate();

            sendError(response, HttpServletResponse.SC_UNAUTHORIZED, "User session is invalid");
            return;
        }

        if (!"ACTIVE".equals(user.getStatus())) {

            session.invalidate();

            sendError(response, HttpServletResponse.SC_FORBIDDEN, "Account is not active");
            return;
        }

        Map<String, Object> userResponse = new LinkedHashMap<>();
        userResponse.put("id", user.getId());
        userResponse.put("name", user.getName());
        userResponse.put("email", user.getEmail());
        userResponse.put("role", user.getRole());

        Map<String, Object> responseBody = new LinkedHashMap<>();
        responseBody.put("success", true);
        responseBody.put("user", userResponse);
        sendJson(response, HttpServletResponse.SC_OK, responseBody);
    }
}
