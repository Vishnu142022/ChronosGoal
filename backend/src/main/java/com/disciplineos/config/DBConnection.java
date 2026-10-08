package com.disciplineos.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * Creates JDBC connections from process properties or environment configuration.
 * DAOs call this centralized factory so credentials are never embedded in SQL code.
 */
public final class DBConnection {

    private static final String DEFAULT_URL =
            "jdbc:mysql://localhost:3306/discipline_os_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";

    private DBConnection() {
    }

    /**
     * Opens a connection using {@code DB_URL}, {@code DB_USER}, and {@code DB_PASSWORD}.
     *
     * @return an open JDBC connection
     * @throws SQLException when required settings are absent or the database rejects the connection
     */
    public static Connection getConnection() throws SQLException {
        String url = requiredSetting("DB_URL", DEFAULT_URL);
        String user = requiredSetting("DB_USER", null);
        String password = requiredSetting("DB_PASSWORD", null);
        loadMySqlDriver();
        return DriverManager.getConnection(url, user, password);
    }

    static void loadMySqlDriver() throws SQLException {
        try {
            // Tomcat webapp class loaders may not participate in DriverManager's one-time service scan.
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException exception) {
            throw new SQLException("MySQL JDBC driver is not available to the application", exception);
        }
    }

    private static String requiredSetting(String name, String defaultValue)
            throws SQLException {
        String value = System.getProperty(name);
        if (value == null || value.isBlank()) {
            value = System.getenv(name);
        }
        if (value == null || value.isBlank()) {
            value = defaultValue;
        }
        if (value == null || value.isBlank()) {
            throw new SQLException(
                    "Missing required database configuration: " + name);
        }
        return value;
    }
}

