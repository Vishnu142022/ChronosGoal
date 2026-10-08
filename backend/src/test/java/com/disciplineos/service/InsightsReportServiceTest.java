package com.disciplineos.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InsightsReportServiceTest {

    @Test
    void percentRoundsCompletedRatioToNearestInteger() {
        assertEquals(67, InsightsReportService.percent(2, 3));
    }

    @Test
    void percentReturnsZeroForNoHabits() {
        assertEquals(0, InsightsReportService.percent(0, 0));
    }

    @Test
    void percentIsCappedAtOneHundred() {
        assertEquals(100, InsightsReportService.percent(7, 4));
    }
}

