package com.disciplineos.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Unit tests for registration and goal request validation rules. */
class RequestValidationTest {

    @Test
    void acceptsValidRegistration() {
        assertNull(RequestValidation.registrationError(
                "A User", "person@example.com", "password1", "password1"));
    }

    @Test
    void rejectsBlankRegistrationName() {
        assertTrue(RequestValidation.registrationError(
                " ", "person@example.com", "password1", "password1").contains("Name"));
    }

    @Test
    void rejectsRegistrationNameOverLimit() {
        assertTrue(RequestValidation.registrationError(
                "n".repeat(121), "person@example.com", "password1", "password1")
                .contains("Name"));
    }

    @Test
    void rejectsMalformedEmail() {
        assertTrue(RequestValidation.registrationError(
                "A User", "bad-email", "password1", "password1").contains("email"));
    }

    @Test
    void rejectsEmailOverLimit() {
        assertTrue(RequestValidation.registrationError(
                "A User", "a".repeat(250) + "@b.com", "password1", "password1")
                .contains("email"));
    }

    @Test
    void rejectsShortPassword() {
        assertTrue(RequestValidation.registrationError(
                "A User", "person@example.com", "short", "short").contains("Password"));
    }

    @Test
    void rejectsMismatchedPasswords() {
        assertTrue(RequestValidation.registrationError(
                "A User", "person@example.com", "password1", "password2")
                .contains("match"));
    }

    @Test
    void acceptsValidGoalDatesAndTarget() {
        assertNull(RequestValidation.goalError("A Goal", new BigDecimal("1"),
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-02")));
    }

    @Test
    void rejectsBlankGoalName() {
        assertTrue(RequestValidation.goalError(" ", BigDecimal.ONE,
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-02"))
                .contains("name"));
    }

    @Test
    void rejectsGoalNameOverLimit() {
        assertTrue(RequestValidation.goalError("g".repeat(161), BigDecimal.ONE,
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-02"))
                .contains("name"));
    }

    @Test
    void rejectsNegativeTarget() {
        assertTrue(RequestValidation.goalError("A Goal", new BigDecimal("-1"),
                LocalDate.parse("2026-01-01"), LocalDate.parse("2026-01-02"))
                .contains("Target"));
    }

    @Test
    void rejectsDeadlineBeforeStartDate() {
        assertTrue(RequestValidation.goalError("A Goal", BigDecimal.ONE,
                LocalDate.parse("2026-01-02"), LocalDate.parse("2026-01-01"))
                .contains("Deadline"));
    }
}

