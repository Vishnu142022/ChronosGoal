package com.disciplineos.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Unit tests for pure time-log interval validation. */
class TimeLogDurationTest {

    @Test
    void calculatesWholeMinuteInterval() {
        assertEquals(60, TimeLogDuration.calculate("09:00", "10:00", "60"));
    }

    @Test
    void roundsSecondsToNearestMinute() {
        assertEquals(2, TimeLogDuration.calculate("09:00:00", "09:01:30", "2"));
    }

    @Test
    void rejectsDurationThatDoesNotMatchInterval() {
        assertThrows(IllegalArgumentException.class,
                () -> TimeLogDuration.calculate("09:00", "10:00", "15"));
    }

    @Test
    void rejectsEndTimeThatIsNotAfterStartTime() {
        assertThrows(IllegalArgumentException.class,
                () -> TimeLogDuration.calculate("10:00", "09:00", "60"));
    }

    @Test
    void rejectsInvalidTimeFormat() {
        assertThrows(IllegalArgumentException.class,
                () -> TimeLogDuration.calculate("nine", "10:00", "60"));
    }

    @Test
    void rejectsNonPositiveDuration() {
        assertThrows(IllegalArgumentException.class,
                () -> TimeLogDuration.calculate("09:00", "10:00", "0"));
    }
}

