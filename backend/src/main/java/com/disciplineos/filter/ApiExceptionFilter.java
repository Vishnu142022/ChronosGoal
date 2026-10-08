package com.disciplineos.filter;

import com.disciplineos.dao.DataAccessException;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Converts DAO failures into safe JSON responses at the API boundary.
 * The filter is mapped before authentication and servlet filters in {@code web.xml}.
 */
public class ApiExceptionFilter implements Filter {

    private static final Logger LOGGER = Logger.getLogger(ApiExceptionFilter.class.getName());

    /** Creates the API-wide persistence exception mapper. */
    public ApiExceptionFilter() {
    }

    /**
     * Runs the API chain and serializes persistence errors without exposing internals.
     *
     * @param request incoming servlet request
     * @param response outgoing servlet response
     * @param chain remaining API filters and servlet
     * @throws IOException when the response cannot be written
     * @throws ServletException when the downstream servlet reports a servlet failure
     */
    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain) throws IOException, ServletException {
        try {
            chain.doFilter(request, response);
        } catch (DataAccessException exception) {
            LOGGER.severe(databaseDiagnostic(exception));
            HttpServletResponse httpResponse = (HttpServletResponse) response;
            if (!httpResponse.isCommitted()) {
                httpResponse.resetBuffer();
                httpResponse.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
                httpResponse.setContentType("application/json");
                httpResponse.setCharacterEncoding("UTF-8");
                httpResponse.getWriter().write(
                        "{\"success\":false,\"message\":\"Database operation failed\"}"
                );
            }
        }
    }

    static String databaseDiagnostic(DataAccessException exception) {
        StringBuilder details = new StringBuilder("API database operation failed");
        Throwable cause = exception;
        int depth = 0;
        while (cause != null) {
            details.append(System.lineSeparator())
                    .append("Cause ").append(depth++)
                    .append(": class=").append(cause.getClass().getName())
                    .append(", message=").append(redact(cause.getMessage()));
            if (cause instanceof SQLException sqlException) {
                details.append(", SQLState=").append(sqlException.getSQLState())
                        .append(", MySQL error code=").append(sqlException.getErrorCode());
                SQLException next = sqlException.getNextException();
                while (next != null) {
                    details.append(System.lineSeparator())
                            .append("Next SQLException: class=")
                            .append(next.getClass().getName())
                            .append(", message=").append(redact(next.getMessage()))
                            .append(", SQLState=").append(next.getSQLState())
                            .append(", MySQL error code=").append(next.getErrorCode());
                    next = next.getNextException();
                }
            }
            cause = cause.getCause();
        }
        StringWriter stackTrace = new StringWriter();
        exception.printStackTrace(new PrintWriter(stackTrace));
        details.append(System.lineSeparator())
                .append("Stack trace:")
                .append(System.lineSeparator())
                .append(redact(stackTrace.toString()));
        return details.toString();
    }

    private static String redact(String value) {
        if (value == null) {
            return "<none>";
        }
        return value.replaceAll(
                        "(?i)(password(?:_hash)?|passwd|pwd|secret|token|hash)(\\s*[=:]\\s*)([^\\s,;]+)",
                        "$1$2<redacted>")
                .replaceAll("\\$2[aby]\\$\\d{2}\\$[./A-Za-z0-9]{53}", "<redacted-bcrypt-hash>");
    }
}
