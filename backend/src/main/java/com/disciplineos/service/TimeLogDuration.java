package com.disciplineos.service;

import java.time.Duration;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;

/**
 * Validates submitted time-log duration against its start and end times.
 * TimeLogServlet uses this pure rule so validation is testable without JDBC.
 */
public final class TimeLogDuration {

    private TimeLogDuration() {
    }

    /**
     * Returns the rounded interval in minutes when it agrees with the submitted value.
     *
     * @param startTime local start time in ISO time format
     * @param endTime local end time in ISO time format
     * @param submittedDuration client-supplied duration in minutes
     * @return rounded elapsed time in minutes
     * @throws IllegalArgumentException when times or duration are invalid or inconsistent
     */
    public static int calculate(
            String startTime,
            String endTime,
            String submittedDuration) {
        int submittedMinutes;
        try {
            submittedMinutes = Integer.parseInt(submittedDuration);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("durationMinutes must be a number");
        }
        if (submittedMinutes <= 0) {
            throw new IllegalArgumentException("durationMinutes must be greater than 0");
        }

        LocalTime start;
        LocalTime end;
        try {
            start = LocalTime.parse(startTime);
            end = LocalTime.parse(endTime);
        } catch (DateTimeParseException exception) {
            throw new IllegalArgumentException(
                    "startTime and endTime must use HH:mm or HH:mm:ss format");
        }
        long seconds = Duration.between(start, end).getSeconds();
        if (seconds <= 0) {
            throw new IllegalArgumentException("End time must be later than start time");
        }
        int calculatedMinutes = (int) Math.max(1, Math.round(seconds / 60.0));
        if (Math.abs(calculatedMinutes - submittedMinutes) > 1) {
            throw new IllegalArgumentException(
                    "durationMinutes must match the interval between startTime and endTime");
        }
        return calculatedMinutes;
    }
}

