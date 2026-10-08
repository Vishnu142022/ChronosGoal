package com.disciplineos.servlet;

import com.disciplineos.dao.UsageDAO;
import com.disciplineos.dao.UserDAO;
import com.disciplineos.service.RequestValidation;
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
import java.util.UUID;

/**
 * Validates and creates user accounts, then establishes the initial session.
 * The frontend uses {@code POST /api/register} with JSON account fields.
 */
@WebServlet("/api/register")
public class RegisterServlet extends ApiServlet {

    /** Repository used to create and load registered accounts. */
    private final UserDAO userDAO;
    /** Repository used to record successful registration activity. */
    private final UsageDAO usageDAO;

    /** Constructs the production servlet with JDBC-backed DAOs. */
    public RegisterServlet() {
        this(new UserDAO(), new UsageDAO());
    }

    RegisterServlet(UserDAO userDAO, UsageDAO usageDAO) {
        this.userDAO = userDAO;
        this.usageDAO = usageDAO;
    }

    /**
     * Handles {@code POST /api/register}.
     *
     * @param request JSON name, email, and password fields
     * @param response JSON account result and HTTP status
     * @throws ServletException when servlet processing fails
     * @throws IOException when the request or response cannot be read or written
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

        String name = stringValue(body, "name");
        String email = stringValue(body, "email");
        String password = stringValue(body, "password");
        String confirmation = stringValue(body, "confirmPassword");
        String validationError = RequestValidation.registrationError(
                name, email, password, confirmation);
        if (validationError != null) {
            sendError(response, HttpServletResponse.SC_BAD_REQUEST,
                    validationError);
            return;
        }

        name = name.trim();
        email = email.trim().toLowerCase();
        if (userDAO.userExists(email)) {
            sendError(response, HttpServletResponse.SC_CONFLICT,
                    "Email already registered");
            return;
        }

        String userId = "usr_" + UUID.randomUUID().toString().replace("-", "");
        // BCrypt's salted hash is stored; the plaintext password is used only for this request.
        boolean created = userDAO.createUser(
                userId,
                name,
                email,
                BCrypt.hashpw(password, BCrypt.gensalt(10))
        );
        if (!created) {
            sendError(response, HttpServletResponse.SC_INTERNAL_SERVER_ERROR,
                    "Unable to create account");
            return;
        }

        // Rotate the newly-created session id so registration cannot inherit a fixed id.
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute("userId", userId);
        session.setAttribute("userName", name);
        session.setAttribute("userEmail", email);
        session.setAttribute("userRole", "USER");
        userDAO.updateLastLogin(userId);
        usageDAO.recordEvent(userId, "AUTH", "REGISTER", requestStartedAt);

        Map<String, Object> userResponse = new LinkedHashMap<>();
        userResponse.put("id", userId);
        userResponse.put("name", name);
        userResponse.put("email", email);
        userResponse.put("role", "USER");
        userResponse.put("status", "ACTIVE");

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Registration successful");
        result.put("user", userResponse);
        sendJson(response, HttpServletResponse.SC_CREATED, result);
    }

    private String stringValue(Map<String, Object> body, String key) {
        Object value = body.get(key);
        return value instanceof String ? (String) value : null;
    }
}

