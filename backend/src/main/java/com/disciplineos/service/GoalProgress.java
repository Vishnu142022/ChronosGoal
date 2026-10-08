package com.disciplineos.service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Calculates goal completion and status transitions independently of JDBC.
 * Services and tests use it to mirror the progress semantics maintained by schema triggers.
 */
public final class GoalProgress {

    private GoalProgress() {
    }

    /**
     * Returns completion percentage, capped at 100; a zero target has zero progress.
     *
     * @param loggedMinutes minutes accumulated by a goal
     * @param targetHours positive target in hours
     * @return rounded percentage from 0 through 100
     */
    public static int percentComplete(long loggedMinutes, BigDecimal targetHours) {
        if (loggedMinutes < 0 || targetHours == null || targetHours.signum() <= 0) {
            return 0;
        }
        BigDecimal targetMinutes = targetHours.multiply(BigDecimal.valueOf(60));
        return BigDecimal.valueOf(loggedMinutes)
                .multiply(BigDecimal.valueOf(100))
                .divide(targetMinutes, 0, RoundingMode.HALF_UP)
                .min(BigDecimal.valueOf(100))
                .intValue();
    }

    /**
     * Returns active/completed status after a log mutation, preserving other statuses.
     *
     * @param currentStatus status before a time-log change
     * @param loggedMinutes remaining logged minutes after the change
     * @param targetHours positive target in hours
     * @return updated status, or the original status for invalid target data
     */
    public static String statusAfterLog(
            String currentStatus,
            long loggedMinutes,
            BigDecimal targetHours) {
        if (targetHours == null || targetHours.signum() <= 0 || loggedMinutes < 0) {
            return currentStatus;
        }
        if (BigDecimal.valueOf(loggedMinutes)
                .compareTo(targetHours.multiply(BigDecimal.valueOf(60))) >= 0) {
            return "COMPLETED";
        }
        if ("COMPLETED".equals(currentStatus)
                || ("NOT_STARTED".equals(currentStatus) && loggedMinutes > 0)) {
            return "IN_PROGRESS";
        }
        return currentStatus;
    }
}

