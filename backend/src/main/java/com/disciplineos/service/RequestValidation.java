package com.disciplineos.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.regex.Pattern;

/**
 * Pure validation rules shared by account and goal request handlers.
 * RegisterServlet and GoalServlet use the same limits exercised by unit tests.
 */
public final class RequestValidation {

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private RequestValidation() {
    }

    /**
     * Returns a validation message, or {@code null} when registration data is valid.
     *
     * @param name account display name
     * @param email account email address
     * @param password requested password
     * @param confirmation repeated password
     * @return validation message, or {@code null} when valid
     */
    public static String registrationError(
            String name,
            String email,
            String password,
            String confirmation) {
        if (name == null || name.isBlank() || name.length() > 120) {
            return "Name is required and must be at most 120 characters";
        }
        if (email == null || email.isBlank() || email.length() > 254
                || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            return "Enter a valid email address";
        }
        if (password == null || password.length() < 8) {
            return "Password must be at least 8 characters";
        }
        if (!password.equals(confirmation)) {
            return "Passwords do not match";
        }
        return null;
    }

    /**
     * Returns a validation message, or {@code null} when goal fields are valid.
     *
     * @param name goal display name
     * @param targetHours positive target in hours
     * @param startDate goal start date
     * @param deadline goal deadline
     * @return validation message, or {@code null} when valid
     */
    public static String goalError(
            String name,
            BigDecimal targetHours,
            LocalDate startDate,
            LocalDate deadline) {
        if (name == null || name.isBlank() || name.length() > 160) {
            return "Goal name is required and must be at most 160 characters";
        }
        if (targetHours == null || targetHours.signum() <= 0) {
            return "Target hours must be greater than 0";
        }
        if (startDate == null || deadline == null || deadline.isBefore(startDate)) {
            return "Deadline must not be before start date";
        }
        return null;
    }
}

