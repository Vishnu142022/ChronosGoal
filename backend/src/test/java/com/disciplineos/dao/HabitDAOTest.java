package com.disciplineos.dao;

import org.junit.jupiter.api.Test;

import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/** Regression tests for JDBC numeric values returned for nullable habit targets. */
class HabitDAOTest {

    @Test
    void mapsMysqlLongTargetsToIntegerValues() throws SQLException {
        assertEquals(5, HabitDAO.nullableInteger(5L));
        assertNull(HabitDAO.nullableInteger(null));
    }

    @Test
    void rejectsUnexpectedTargetTypes() {
        assertThrows(SQLException.class, () -> HabitDAO.nullableInteger("5"));
    }
}

