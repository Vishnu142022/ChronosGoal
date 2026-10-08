package com.disciplineos.config;

import java.sql.Connection;

/**
 * Provides a command-line database connectivity check for local setup.
 * Developers call {@link #main(String[])} when validating JDBC configuration.
 */
public class DBTest {
    /** Creates a command-line database connectivity check. */
    public DBTest() { }

    /**
     * Opens and closes a database connection, reporting whether configuration works.
     *
     * @param args command-line arguments (unused)
     */
    public static void main(String[] args) {

        try (Connection connection = DBConnection.getConnection()) {

            if (connection != null && !connection.isClosed()) {
                System.out.println("=================================");
                System.out.println("DATABASE CONNECTION SUCCESSFUL!");
                System.out.println("Database: discipline_os_db");
                System.out.println("=================================");
            }

        } catch (Exception e) {
            System.out.println("DATABASE CONNECTION FAILED!");
            e.printStackTrace();
        }
    }
}
