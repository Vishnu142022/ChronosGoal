package com.disciplineos.service;

import java.time.LocalDate;
import java.util.Map;

/**
 * Pure habit-history calculations shared by HabitServlet and unit tests.
 * Logs are date-keyed to keep streak calculations independent of the database and timezone.
 */
public final class HabitProgress {

    private HabitProgress() { }

    /**
     * Calculates the active streak, allowing an incomplete current day without breaking yesterday's run.
     *
     * @param history date-keyed habit status values
     * @param today current local calendar date
     * @return number of consecutive completed dates
     */
    public static int currentStreak(Map<String, ?> history, LocalDate today) {
        LocalDate cursor = completed(history, today) ? today : today.minusDays(1);
        int streak = 0;
        while (completed(history, cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    /**
     * Calculates the longest consecutive completion run in the stored history.
     *
     * @param history date-keyed habit status values
     * @return longest consecutive run
     */
    public static int bestStreak(Map<String, ?> history) {
        int best = 0;
        int run = 0;
        LocalDate previous = null;
        for (String date : history.keySet().stream().sorted().toList()) {
            LocalDate current = LocalDate.parse(date);
            if (!completed(history, current)) {
                run = 0;
                previous = current;
            } else {
                run = previous != null && current.equals(previous.plusDays(1)) ? run + 1 : 1;
                best = Math.max(best, run);
                previous = current;
            }
        }
        return best;
    }

    private static boolean completed(Map<String, ?> history, LocalDate date) {
        Object value = history.get(date.toString());
        return Boolean.TRUE.equals(value) || "COMPLETED".equals(value) || "FROZEN".equals(value);
    }
}

