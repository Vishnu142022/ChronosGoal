package com.disciplineos.servlet;

import com.disciplineos.dao.UserDAO;
import com.disciplineos.dao.UserDAO.UserData;
import com.disciplineos.dao.UsageDAO;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.mindrot.jbcrypt.BCrypt;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.logging.Logger;

/**
 * Authenticates administrators and creates their HTTP session.
 * Tomcat routes {@code POST /api/admin-login} here; BCrypt verifies stored credentials.
 */
@WebServlet("/api/admin-login")
public class AdminLoginServlet extends ApiServlet {

    private static final Logger LOGGER =
            Logger.getLogger(AdminLoginServlet.class.getName());

    /** Account repository used for admin lookup and bootstrap writes. */
    private final UserDAO userDAO;
    /** Usage repository used to record successful admin authentication. */
    private final UsageDAO usageDAO;
    /** Environment lookup used to read deployment-provided bootstrap settings. */
    private final Function<String, String> environmentLookup;

    /** Constructs the production servlet with JDBC-backed DAOs. */
    public AdminLoginServlet() {
        this(new UserDAO(), new UsageDAO(), System::getenv);
    }

    AdminLoginServlet(UserDAO userDAO, UsageDAO usageDAO) {
        this(userDAO, usageDAO, System::getenv);
    }

    AdminLoginServlet(
            UserDAO userDAO,
            UsageDAO usageDAO,
            Function<String, String> environmentLookup) {
        this.userDAO = userDAO;
        this.usageDAO = usageDAO;
        this.environmentLookup = environmentLookup;
    }

    /**
     * Handles {@code POST /api/admin-login}.
     *
     * @param request JSON email and password request
     * @param response JSON result and status
     * @throws ServletException if servlet processing fails
     * @throws IOException if the request or response cannot be read or written
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
        String email = emailValue instanceof String ? (String) emailValue : null;
        String password = passwordValue instanceof String ? (String) passwordValue : null;

        if (email == null || email.trim().isEmpty()
                || password == null || password.isEmpty()) {
            sendError(
                    response,
                    HttpServletResponse.SC_BAD_REQUEST,
                    "Admin email and password are required"
            );
            return;
        }

        String normalizedEmail = email.trim().toLowerCase();
        UserData user = userDAO.getUserByEmail(normalizedEmail);
        BootstrapCredentials bootstrapCredentials = user == null
                ? getBootstrapCredentials(normalizedEmail, password)
                : new BootstrapCredentials(true, true, false);
        // Bootstrap only after a constant-time comparison with deployment-provided credentials.
        if (user == null && bootstrapCredentials.matches) {
            bootstrapAdmin(normalizedEmail, password);
            user = userDAO.getUserByEmail(normalizedEmail);
        }

        if (user == null && bootstrapCredentials.configured
                && !bootstrapCredentials.emailMatches) {
            LOGGER.warning("Admin login email does not match a configured account.");
        }

        if (user == null || !"ADMIN".equalsIgnoreCase(user.getRole())) {
            sendError(
                    response,
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "Invalid admin credentials"
            );
            return;
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            sendError(
                    response,
                    HttpServletResponse.SC_FORBIDDEN,
                    "Admin account is not active"
            );
            return;
        }

        // BCrypt stores salted one-way hashes; plaintext credentials are never persisted.
        boolean passwordMatches;
        try {
            passwordMatches = BCrypt.checkpw(password, user.getPasswordHash());
        } catch (IllegalArgumentException e) {
            passwordMatches = false;
        }

        if (!passwordMatches) {
            if (matchesConfiguredAdminCredentials(normalizedEmail, password)
                    && userDAO.updateActiveAdminPasswordHash(
                            normalizedEmail,
                            BCrypt.hashpw(password, BCrypt.gensalt(10)))) {
                user = userDAO.getUserByEmail(normalizedEmail);
                passwordMatches = user != null
                        && BCrypt.checkpw(password, user.getPasswordHash());
            }

            if (!passwordMatches) {
                sendError(
                        response,
                        HttpServletResponse.SC_UNAUTHORIZED,
                        "Invalid admin credentials"
                );
                return;
            }
        }

        // Rotate the session id after authentication to prevent session fixation.
        HttpSession session = request.getSession(true);
        request.changeSessionId();
        session.setAttribute("userId", user.getId());
        session.setAttribute("userName", user.getName());
        session.setAttribute("userEmail", user.getEmail());
        session.setAttribute("userRole", user.getRole());
        userDAO.updateLastLogin(user.getId());
        usageDAO.recordEvent(user.getId(), "AUTH", "ADMIN_LOGIN", requestStartedAt);

        Map<String, Object> userResponse = new LinkedHashMap<>();
        userResponse.put("id", user.getId());
        userResponse.put("name", user.getName());
        userResponse.put("email", user.getEmail());
        userResponse.put("role", user.getRole());
        userResponse.put("status", user.getStatus());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        result.put("message", "Admin authentication successful");
        result.put("redirectTo", "/admin/dashboard");
        result.put("user", userResponse);
        sendJson(response, HttpServletResponse.SC_OK, result);
    }

    private BootstrapCredentials getBootstrapCredentials(
            String email,
            String password) {
        String configuredEmail = environmentLookup.apply("ADMIN_EMAIL");
        String configuredPassword = environmentLookup.apply("ADMIN_PASSWORD");
        if (configuredEmail == null || configuredEmail.isBlank()
                || configuredPassword == null || configuredPassword.isBlank()) {
            LOGGER.warning("Admin bootstrap variables are not configured.");
            return new BootstrapCredentials(false, false, false);
        }

        boolean emailMatches = MessageDigest.isEqual(
                email.getBytes(StandardCharsets.UTF_8),
                configuredEmail.trim().toLowerCase().getBytes(StandardCharsets.UTF_8)
        );
        boolean passwordMatches = MessageDigest.isEqual(
                password.getBytes(StandardCharsets.UTF_8),
                configuredPassword.getBytes(StandardCharsets.UTF_8)
        );
        return new BootstrapCredentials(true, emailMatches,
                emailMatches && passwordMatches);
    }

    private boolean matchesConfiguredAdminCredentials(String email, String password) {
        String configuredEmail = environmentLookup.apply("ADMIN_EMAIL");
        String configuredPassword = environmentLookup.apply("ADMIN_PASSWORD");
        if (configuredEmail == null || configuredEmail.isBlank()
                || configuredPassword == null || configuredPassword.isBlank()) {
            return false;
        }
        boolean emailMatches = MessageDigest.isEqual(
                email.getBytes(StandardCharsets.UTF_8),
                configuredEmail.trim().toLowerCase().getBytes(StandardCharsets.UTF_8)
        );
        boolean passwordMatches = MessageDigest.isEqual(
                password.getBytes(StandardCharsets.UTF_8),
                configuredPassword.getBytes(StandardCharsets.UTF_8)
        );
        return emailMatches && passwordMatches;
    }

    private record BootstrapCredentials(
            boolean configured,
            boolean emailMatches,
            boolean matches) { }

    private void bootstrapAdmin(String email, String password) {
        // Hash the deployment-provided bootstrap password before storing the first admin record.
        String passwordHash = BCrypt.hashpw(password, BCrypt.gensalt(10));
        userDAO.createAdminUser(
                "usr_" + UUID.randomUUID().toString().replace("-", ""),
                "Administrator",
                email,
                passwordHash
        );
    }

}

