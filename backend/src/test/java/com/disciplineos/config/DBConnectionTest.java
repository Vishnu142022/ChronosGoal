package com.disciplineos.config;

import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

/** Tests MySQL JDBC driver visibility without opening a database connection. */
class DBConnectionTest {

    @Test
    void explicitlyRegistersMySqlDriverForTheWebApplicationClassLoader() throws SQLException {
        DBConnection.loadMySqlDriver();

        assertDoesNotThrow(() ->
                DriverManager.getDriver("jdbc:mysql://localhost:3306/discipline_os_db"));
    }
}

