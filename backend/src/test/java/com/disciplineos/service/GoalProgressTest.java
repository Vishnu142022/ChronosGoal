package com.disciplineos.service;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** Unit tests for goal completion percentages and status transitions. */
class GoalProgressTest {

    @Test
    void returnsZeroPercentWithoutLoggedMinutes() {
        assertEquals(0, GoalProgress.percentComplete(0, new BigDecimal("2")));
    }

    @Test
    void returnsHalfCompleteAtHalfTarget() {
        assertEquals(50, GoalProgress.percentComplete(60, new BigDecimal("2")));
    }

    @Test
    void returnsExactlyOneHundredAtTarget() {
        assertEquals(100, GoalProgress.percentComplete(120, new BigDecimal("2")));
    }

    @Test
    void capsProgressOverTargetAtOneHundred() {
        assertEquals(100, GoalProgress.percentComplete(240, new BigDecimal("2")));
    }

    @Test
    void guardsAgainstZeroTarget() {
        assertEquals(0, GoalProgress.percentComplete(20, BigDecimal.ZERO));
    }

    @Test
    void startsGoalWhenFirstTimeIsLogged() {
        assertEquals("IN_PROGRESS",
                GoalProgress.statusAfterLog("NOT_STARTED", 1, new BigDecimal("2")));
    }

    @Test
    void keepsGoalNotStartedUntilTimeIsLogged() {
        assertEquals("NOT_STARTED",
                GoalProgress.statusAfterLog("NOT_STARTED", 0, new BigDecimal("2")));
    }

    @Test
    void completesGoalAtTarget() {
        assertEquals("COMPLETED",
                GoalProgress.statusAfterLog("IN_PROGRESS", 120, new BigDecimal("2")));
    }

    @Test
    void returnsCompletedGoalToProgressWhenLoggedTimeIsRemoved() {
        assertEquals("IN_PROGRESS",
                GoalProgress.statusAfterLog("COMPLETED", 119, new BigDecimal("2")));
    }
}

