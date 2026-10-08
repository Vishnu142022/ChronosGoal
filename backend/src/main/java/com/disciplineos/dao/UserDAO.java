package com.disciplineos.dao;

import com.disciplineos.config.DBConnection;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Performs user-account queries and mutations using JDBC prepared statements.
 * Authentication servlets and AuthFilter use this DAO to load the account behind a session.
 */
public class UserDAO {

    private static final Logger LOGGER = Logger.getLogger(UserDAO.class.getName());

    /** Creates a user data-access object. */
    public UserDAO() { }

    /**
     * Updates the most recent login timestamp; failure is logged because the login itself
     * must not be undone by supplementary timestamp maintenance.
     *
     * @param userId authenticated account id
     */
    public void updateLastLogin(String userId) {
        String sql = "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?";
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            statement.executeUpdate();
        } catch (SQLException exception) {
            LOGGER.log(Level.WARNING, "Unable to update last login for user " + userId,
                    exception);
        }
    }

    /**
     * Finds an account by its primary key.
     *
     * @param userId account id
     * @return account data, or {@code null} when no row matches
     */
    public UserData getUserById(String userId) {

        String sql = """
                SELECT id, name, email, password_hash, role, status
                FROM users
                WHERE id = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, userId);

            try (ResultSet resultSet = statement.executeQuery()) {

                if (resultSet.next()) {
                    return mapUser(resultSet);
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to load user", e);
        }

        return null;
    }

    /**
     * Finds an account by normalized email.
     *
     * @param email email address
     * @return account data, or {@code null} when no row matches
     */
    public UserData getUserByEmail(String email) {

        String sql = """
                SELECT id, name, email, password_hash, role, status
                FROM users
                WHERE email = ?
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, email);

            try (ResultSet resultSet = statement.executeQuery()) {

                if (resultSet.next()) {
                    return mapUser(resultSet);
                }
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to find user by email", e);
        }

        return null;
    }

    /**
     * Checks for an existing email address.
     *
     * @param email email address
     * @return whether the email is registered
     */
    public boolean userExists(String email) {

        String sql = """
                SELECT 1
                FROM users
                WHERE email = ?
                LIMIT 1
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, email);

            try (ResultSet resultSet = statement.executeQuery()) {
                return resultSet.next();
            }

        } catch (SQLException e) {
            throw new DataAccessException("Unable to check user account", e);
        }
    }

    /**
     * Creates an active user account.
     *
     * @param id generated account id
     * @param name display name
     * @param email normalized email address
     * @param passwordHash BCrypt password hash
     * @return whether a row was inserted
     */
    public boolean createUser(
            String id,
            String name,
            String email,
            String passwordHash) {

        String sql = """
                INSERT INTO users
                (id, name, email, password_hash, role, status)
                VALUES (?, ?, ?, ?, 'USER', 'ACTIVE')
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, id);
            statement.setString(2, name);
            statement.setString(3, email);
            statement.setString(4, passwordHash);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to create user account", e);
        }
    }

    /**
     * Creates an active administrator account during configured bootstrap.
     *
     * @param id generated account id
     * @param name administrator display name
     * @param email normalized email
     * @param passwordHash BCrypt password hash
     * @return whether a row was inserted
     */
    public boolean createAdminUser(
            String id,
            String name,
            String email,
            String passwordHash) {

        String sql = """
                INSERT INTO users
                (id, name, email, password_hash, role, status)
                VALUES (?, ?, ?, ?, 'ADMIN', 'ACTIVE')
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, id);
            statement.setString(2, name);
            statement.setString(3, email);
            statement.setString(4, passwordHash);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to create administrator account", e);
        }
    }

    /**
     * Replaces the hash only for an active administrator matching the email.
     *
     * @param email administrator email
     * @param passwordHash new BCrypt hash
     * @return whether an eligible administrator was updated
     */
    public boolean updateActiveAdminPasswordHash(
            String email,
            String passwordHash) {

        String sql = """
                UPDATE users
                SET password_hash = ?
                WHERE email = ? AND role = 'ADMIN' AND status = 'ACTIVE'
                """;

        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {

            statement.setString(1, passwordHash);
            statement.setString(2, email);

            return statement.executeUpdate() > 0;

        } catch (SQLException e) {
            throw new DataAccessException("Unable to update administrator password", e);
        }
    }

    // Convert the current ResultSet row into UserData
    private UserData mapUser(ResultSet resultSet) throws SQLException {

        return new UserData(
                resultSet.getString("id"),
                resultSet.getString("name"),
                resultSet.getString("email"),
                resultSet.getString("password_hash"),
                resultSet.getString("role"),
                resultSet.getString("status")
        );
    }

    /** Immutable account fields returned to authentication and authorization code. */
    public static class UserData {

        private final String id;
        private final String name;
        private final String email;
        private final String passwordHash;
        private final String role;
        private final String status;

        /**
         * Creates an account query result.
         *
         * @param id account id
         * @param name display name
         * @param email email
         * @param passwordHash stored BCrypt hash
         * @param role account role
         * @param status account status
         */
        public UserData(
                String id,
                String name,
                String email,
                String passwordHash,
                String role,
                String status) {

            this.id = id;
            this.name = name;
            this.email = email;
            this.passwordHash = passwordHash;
            this.role = role;
            this.status = status;
        }

        /**
         * Returns the account identifier.
         *
         * @return the account identifier
         */
        public String getId() {
            return id;
        }

        /**
         * Returns the display name.
         *
         * @return the display name
         */
        public String getName() {
            return name;
        }

        /**
         * Returns the email address.
         *
         * @return the email address
         */
        public String getEmail() {
            return email;
        }

        /**
         * Returns the stored BCrypt password hash.
         *
         * @return the stored password hash
         */
        public String getPasswordHash() {
            return passwordHash;
        }

        /**
         * Returns the account role.
         *
         * @return the account role
         */
        public String getRole() {
            return role;
        }

        /**
         * Returns the account status.
         *
         * @return the account status
         */
        public String getStatus() {
            return status;
        }
    }
}
