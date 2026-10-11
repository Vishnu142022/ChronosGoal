package com.disciplineos.config;

import org.junit.jupiter.api.Test;

import java.sql.DriverManager;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Tests MySQL JDBC driver visibility without opening a database connection. */
class DBConnectionTest {

    @Test
    void explicitlyRegistersMySqlDriverForTheWebApplicationClassLoader() throws SQLException {
        DBConnection.loadMySqlDriver();

        assertDoesNotThrow(() ->
                DriverManager.getDriver("jdbc:mysql://localhost:3306/discipline_os_db"));
    }

    @Test
    void databaseSettingsPreferSystemPropertiesThenEnvironmentAndDefaults() throws SQLException {
        assertEquals("property-user",
                DBConnection.requiredSetting("DB_USER", "property-user", "environment-user", null));
        assertEquals("environment-password",
                DBConnection.requiredSetting("DB_PASSWORD", " ", "environment-password", null));
        assertEquals("default-url",
                DBConnection.requiredSetting("DB_URL", null, "", "default-url"));
    }

    @Test
    void missingRequiredDatabaseSettingNamesTheVariableWithoutExposingValues() {
        SQLException exception = assertThrows(SQLException.class,
                () -> DBConnection.requiredSetting("DB_USER", " ", null, null));

        assertTrue(exception.getMessage().contains("DB_USER"));
    }
}
