package com.disciplineos.servlet;

import com.disciplineos.dao.UsageDAO;
import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;
import com.fasterxml.jackson.core.JsonProcessingException;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.mindrot.jbcrypt.BCrypt;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Authenticates regular users and establishes their session.
 * The frontend sends JSON to {@code POST /api/login}; the DAO performs account lookup.
 */
@WebServlet("/api/login")
public class LoginServlet extends ApiServlet {

    /** Repository used to verify user credentials and load account data. */
    private final UserDAO userDAO;
    /** Repository used to record successful login activity. */
    private final UsageDAO usageDAO;

    /** Constructs the production servlet with JDBC-backed DAOs. */
    public LoginServlet() {
        this(new UserDAO(), new UsageDAO());
    }

    LoginServlet(UserDAO userDAO, UsageDAO usageDAO) {
        this.userDAO = userDAO;
        this.usageDAO = usageDAO;
    }

    /**
     * Handles {@code POST /api/login}.
     *
     * @param request JSON email/password body
     * @param response JSON user result and HTTP status
     * @throws ServletException when servlet processing fails
     * @throws IOException when the body or response cannot be read or written
     */
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {
        long requestStartedAt = System.nanoTime();
        Map<String, Object> body;
        try {
            body = ServletJson.readObject(readJsonBody(request));
        } catch (JsonProcessingException exception) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Request body must be a JSON object");
            return;
        }

        Object emailValue = body.get("email");
        Object passwordValue = body.get("password");
        if (!(emailValue instanceof String) || ((String) emailValue).isBlank()
                || !(passwordValue instanceof String) || ((String) passwordValue).isEmpty()) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    "Email and password are required");
            return;
        }

        String email = ((String) emailValue).trim().toLowerCase();
        String password = (String) passwordValue;
        UserData user = userDAO.getUserByEmail(email);
        if (user == null) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid email or password");
            return;
        }
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            sendError(response, HttpServletResponse.SC_FORBIDDEN,
                    "Account is not active");
            return;
        }

        boolean passwordMatches;
        try {
            passwordMatches = BCrypt.checkpw(password, user.getPasswordHash());
        } catch (IllegalArgumentException exception) {
            passwordMatches = false;
        }
        if (!passwordMatches) {
            sendError(response, HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid email or password");
            return;
        }

        userDAO.updateLastLogin(user.getId());
        // Rotate the session id after authentication to prevent session fixation.
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute("userId", user.getId());
        session.setAttribute("userName", user.getName());
        session.setAttribute("userEmail", user.getEmail());
        session.setAttribute("userRole", user.getRole());
        usageDAO.recordEvent(user.getId(), "AUTH", "LOGIN", requestStartedAt);

        Map<String, Object> userResponse = new LinkedHashMap<>();
        userResponse.put("id", user.getId());
        userResponse.put("name", user.getName());
        userResponse.put("email", user.getEmail());
        userResponse.put("role", user.getRole());
        userResponse.put("status", user.getStatus());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Login successful");
        result.put("user", userResponse);
        sendJson(response, HttpServletResponse.SC_OK, result);
    }
}

