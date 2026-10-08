package com.disciplineos.service;

import com.disciplineos.dao.AdminDAO;
import com.disciplineos.dao.DataAccessException;
import org.junit.jupiter.api.Test;

import java.sql.SQLException;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** Tests report assembly, failure propagation, and executor lifecycle without a database. */
class AdminDashboardReportServiceTest {

    @Test
    void returnsAllFiveDashboardSections() {
        AdminDAO dao = new AdminDAO() {
            @Override public Map<String, Object> getStats() { return Map.of("count", 1); }
            @Override public List<Map<String, Object>> getUsers() { return List.of(Map.of()); }
            @Override public List<Map<String, Object>> getGoalParameters() { return List.of(Map.of()); }
            @Override public List<Map<String, Object>> getUsage() { return List.of(Map.of()); }
            @Override public List<Map<String, Object>> getAuditLogs() { return List.of(Map.of()); }
        };
        try (AdminDashboardReportService service = new AdminDashboardReportService(dao)) {
            Map<String, Object> report = service.createReport();
            assertEquals(6, report.size());
            assertTrue(report.containsKey("stats"));
            assertTrue(report.containsKey("users"));
            assertTrue(report.containsKey("parameters"));
            assertTrue(report.containsKey("usage"));
            assertTrue(report.containsKey("logs"));
        }
    }

    @Test
    void surfacesReportFailuresAsDataAccessException() {
        AdminDAO dao = new AdminDAO() {
            @Override public Map<String, Object> getStats() throws SQLException {
                throw new SQLException("database unavailable");
            }
        };
        try (AdminDashboardReportService service = new AdminDashboardReportService(dao)) {
            assertThrows(DataAccessException.class, service::createReport);
        }
    }

    @Test
    void closeShutsDownReportExecutor() {
        AdminDashboardReportService service =
                new AdminDashboardReportService(new AdminDAO());
        service.close();
        assertTrue(service.isShutdown());
    }
}

