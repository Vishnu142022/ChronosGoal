package com.disciplineos.filter;

import com.disciplineos.dao.DataAccessException;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiExceptionFilterTest {

    @Test
    void diagnosticIncludesSqlDetailsAndRedactsSecretValues() {
        SQLException sqlException = new SQLException(
                "Access denied; password=do-not-log password_hash=also-secret "
                        + "$2a$10$" + "A".repeat(53),
                "28000",
                1045);
        DataAccessException exception =
                new DataAccessException("Unable to create user account", sqlException);

        String diagnostic = ApiExceptionFilter.databaseDiagnostic(exception);

        assertTrue(diagnostic.contains("java.sql.SQLException"));
        assertTrue(diagnostic.contains("SQLState=28000"));
        assertTrue(diagnostic.contains("MySQL error code=1045"));
        assertTrue(diagnostic.contains("Stack trace:"));
        assertTrue(diagnostic.contains("password=<redacted>"));
        assertTrue(diagnostic.contains("password_hash=<redacted>"));
        assertTrue(diagnostic.contains("<redacted-bcrypt-hash>"));
        assertFalse(diagnostic.contains("do-not-log"));
        assertFalse(diagnostic.contains("also-secret"));
        assertFalse(diagnostic.contains("A".repeat(53)));
    }
}

