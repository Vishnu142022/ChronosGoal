package com.disciplineos.service;

import com.disciplineos.dao.AdminDAO;
import com.disciplineos.dao.DataAccessException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ThreadFactory;

/**
 * Builds the administrator dashboard from five independent DAO queries.
 * AdminServlet owns the service lifecycle; a bounded executor limits report concurrency.
 */
public class AdminDashboardReportService implements AutoCloseable {

    private final AdminDAO adminDAO;
    // Five simultaneous sections bound database fan-out; the bounded queue prevents request spikes
    // from creating unbounded work, and CallerRunsPolicy applies back-pressure to request threads.
    private final ExecutorService reportThreads =
            new ThreadPoolExecutor(
                    5,
                    5,
                    0,
                    TimeUnit.MILLISECONDS,
                    new ArrayBlockingQueue<>(25),
                    reportThreadFactory(),
                    new ThreadPoolExecutor.CallerRunsPolicy()
            );

    /**
     * Creates the production report service with the JDBC administrator DAO.
     */
    public AdminDashboardReportService() {
        this(new AdminDAO());
    }

    /**
     * Creates a report service using the supplied persistence boundary.
     *
     * @param adminDAO administrator data source used by report tasks
     */
    public AdminDashboardReportService(AdminDAO adminDAO) {
        this.adminDAO = adminDAO;
    }

    /**
     * Executes and combines statistics, users, parameters, usage, and audit queries.
     *
     * @return the stable dashboard response map
     * @throws DataAccessException when a report task fails or waiting is interrupted
     */
    public Map<String, Object> createReport() {
        Future<Map<String, Object>> stats = reportThreads.submit(adminDAO::getStats);
        Future<?> users = reportThreads.submit(adminDAO::getUsers);
        Future<?> parameters = reportThreads.submit(adminDAO::getGoalParameters);
        Future<?> usage = reportThreads.submit(adminDAO::getUsage);
        Future<?> audit = reportThreads.submit(adminDAO::getAuditLogs);

        try {
            Map<String, Object> report = new LinkedHashMap<>();
            report.put("success", true);
            report.put("stats", stats.get());
            report.put("users", users.get());
            report.put("parameters", parameters.get());
            report.put("usage", usage.get());
            report.put("logs", audit.get());
            return report;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new DataAccessException("Dashboard report was interrupted", exception);
        } catch (ExecutionException exception) {
            throw new DataAccessException(
                    "Unable to generate dashboard report", exception.getCause());
        }
    }

    /**
     * Stops accepting report work and shuts down the owned worker pool.
     */
    @Override
    public void close() {
        reportThreads.shutdown();
    }

    boolean isShutdown() {
        return reportThreads.isShutdown();
    }

    private ThreadFactory reportThreadFactory() {
        return task -> {
            Thread thread = new Thread(task, "chronos-admin-report");
            thread.setDaemon(true);
            return thread;
        };
    }
}

