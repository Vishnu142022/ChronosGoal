package com.disciplineos.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class HabitProgressTest {

    @Test
    void currentStreakCountsFromTodayWhenTodayIsCompleted() {
        Map<String, String> history = Map.of(
                "2026-10-02", "COMPLETED",
                "2026-10-03", "COMPLETED",
                "2026-10-04", "COMPLETED");

        assertEquals(3, HabitProgress.currentStreak(history, LocalDate.parse("2026-10-04")));
    }

    @Test
    void currentStreakAllowsTodayToRemainIncomplete() {
        Map<String, String> history = Map.of(
                "2026-10-02", "COMPLETED",
                "2026-10-03", "COMPLETED");

        assertEquals(2, HabitProgress.currentStreak(history, LocalDate.parse("2026-10-04")));
    }

    @Test
    void frozenDatePreservesCurrentStreak() {
        Map<String, String> history = Map.of(
                "2026-10-03", "COMPLETED",
                "2026-10-04", "FROZEN");

        assertEquals(2, HabitProgress.currentStreak(history, LocalDate.parse("2026-10-04")));
    }

    @Test
    void missedDateBreaksCurrentStreak() {
        Map<String, String> history = Map.of(
                "2026-10-02", "COMPLETED",
                "2026-10-03", "MISSED");

        assertEquals(0, HabitProgress.currentStreak(history, LocalDate.parse("2026-10-04")));
    }

    @Test
    void bestStreakReturnsLongestRunAcrossHistory() {
        Map<String, String> history = Map.of(
                "2026-10-01", "COMPLETED",
                "2026-10-02", "FROZEN",
                "2026-10-03", "COMPLETED",
                "2026-10-05", "COMPLETED",
                "2026-10-06", "COMPLETED");

        assertEquals(3, HabitProgress.bestStreak(history));
    }

    @Test
    void emptyHistoryHasNoStreak() {
        assertEquals(0, HabitProgress.currentStreak(Map.of(), LocalDate.parse("2026-10-04")));
        assertEquals(0, HabitProgress.bestStreak(Map.of()));
    }
}

