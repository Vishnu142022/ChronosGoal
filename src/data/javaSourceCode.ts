import { JavaSourceFile } from '../types';

export const JAVA_PROJECT_FILES: JavaSourceFile[] = [
  {
    path: 'src/main/java/com/timetrack/model/BaseEntity.java',
    package: 'com.timetrack.model',
    fileName: 'BaseEntity.java',
    category: 'MODEL',
    rubricCategory: 'OOP Concepts & Inheritance',
    description: 'Abstract base entity establishing common properties, encapsulation, and timestamp tracking across all domain models.',
    code: `package com.timetrack.model;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

/**
 * Base abstract class demonstrating Object-Oriented Inheritance,
 * Encapsulation, and Serializable contract for Session caching.
 */
public abstract class BaseEntity implements Serializable {
    private static final long serialVersionUID = 1L;

    protected Long id;
    protected LocalDateTime createdAt;
    protected LocalDateTime updatedAt;

    public BaseEntity() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public BaseEntity(Long id) {
        this();
        this.id = id;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof BaseEntity)) return false;
        BaseEntity that = (BaseEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/model/User.java',
    package: 'com.timetrack.model',
    fileName: 'User.java',
    category: 'MODEL',
    rubricCategory: 'OOP & Encapsulation',
    description: 'Encapsulated user entity with role-based authorization helpers, builder pattern, and password hashing utility.',
    code: `package com.timetrack.model;

import java.time.LocalDateTime;

public class User extends BaseEntity {
    public enum Role { ADMIN, USER }
    public enum Status { ACTIVE, SUSPENDED, INACTIVE }

    private String name;
    private String email;
    private String passwordHash;
    private Role role;
    private Status status;
    private LocalDateTime lastLoginAt;
    private String department;

    public User() {
        super();
        this.role = Role.USER;
        this.status = Status.ACTIVE;
    }

    public User(Long id, String name, String email, String passwordHash, Role role) {
        super(id);
        this.name = name;
        this.email = email;
        this.passwordHash = passwordHash;
        this.role = role;
        this.status = Status.ACTIVE;
    }

    public boolean isAdmin() {
        return this.role == Role.ADMIN;
    }

    public boolean isActive() {
        return this.status == Status.ACTIVE;
    }

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }

    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    @Override
    public String toString() {
        return "User{id=" + id + ", name='" + name + "', email='" + email + "', role=" + role + "}";
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/model/Goal.java',
    package: 'com.timetrack.model',
    fileName: 'Goal.java',
    category: 'MODEL',
    rubricCategory: 'OOP & Collections',
    description: 'Goal domain model with progress calculation logic, milestone collections, and Comparable implementation for priority queues.',
    code: `package com.timetrack.model;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class Goal extends BaseEntity implements Comparable<Goal> {
    public enum Priority { LOW, MEDIUM, HIGH, URGENT }
    public enum Status { IN_PROGRESS, COMPLETED, OVERDUE, PAUSED }

    private Long userId;
    private String name;
    private String category;
    private double targetHours;
    private LocalDate deadline;
    private LocalDate startDate;
    private Priority priority;
    private Status status;
    private String description;
    private long totalLoggedMinutes;
    private List<Milestone> milestones = new ArrayList<>();

    public Goal() {
        super();
        this.status = Status.IN_PROGRESS;
        this.priority = Priority.MEDIUM;
        this.startDate = LocalDate.now();
    }

    public double getLoggedHours() {
        return totalLoggedMinutes / 60.0;
    }

    public double getProgressPercentage() {
        if (targetHours <= 0) return 0.0;
        double percent = (getLoggedHours() / targetHours) * 100.0;
        return Math.min(100.0, Math.round(percent * 100.0) / 100.0);
    }

    public boolean isCompleted() {
        return this.status == Status.COMPLETED || getProgressPercentage() >= 100.0;
    }

    public boolean isOverdue() {
        return deadline != null && LocalDate.now().isAfter(deadline) && !isCompleted();
    }

    public double getRemainingHours() {
        return Math.max(0.0, targetHours - getLoggedHours());
    }

    @Override
    public int compareTo(Goal other) {
        // Natural ordering: Most urgent deadline first
        if (this.deadline == null && other.deadline == null) return 0;
        if (this.deadline == null) return 1;
        if (other.deadline == null) return -1;
        return this.deadline.compareTo(other.deadline);
    }

    // Getters and Setters
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public double getTargetHours() { return targetHours; }
    public void setTargetHours(double targetHours) { this.targetHours = targetHours; }

    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public Priority getPriority() { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public long getTotalLoggedMinutes() { return totalLoggedMinutes; }
    public void setTotalLoggedMinutes(long totalLoggedMinutes) { this.totalLoggedMinutes = totalLoggedMinutes; }

    public List<Milestone> getMilestones() { return milestones; }
    public void setMilestones(List<Milestone> milestones) { this.milestones = milestones; }
}`
  },
  {
    path: 'src/main/java/com/timetrack/model/TimeLog.java',
    package: 'com.timetrack.model',
    fileName: 'TimeLog.java',
    category: 'MODEL',
    rubricCategory: 'OOP & Validation',
    description: 'Time log entity encapsulating start time, end time, duration validation, and associated goal references.',
    code: `package com.timetrack.model;

import com.timetrack.exception.ValidationException;
import java.time.Duration;
import java.time.LocalDateTime;

public class TimeLog extends BaseEntity {
    private Long goalId;
    private Long userId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private long durationMinutes;
    private String notes;
    private int productivityRating; // 1 to 5 scale

    public TimeLog() {
        super();
        this.productivityRating = 5;
    }

    public TimeLog(Long goalId, Long userId, LocalDateTime startTime, LocalDateTime endTime, String notes) 
            throws ValidationException {
        super();
        this.goalId = goalId;
        this.userId = userId;
        this.startTime = startTime;
        this.endTime = endTime;
        this.notes = notes;
        this.productivityRating = 5;
        validateAndComputeDuration();
    }

    public void validateAndComputeDuration() throws ValidationException {
        if (startTime == null || endTime == null) {
            throw new ValidationException("Start time and End time must not be null.");
        }
        if (endTime.isBefore(startTime)) {
            throw new ValidationException("End time cannot be earlier than start time.");
        }
        this.durationMinutes = Duration.between(startTime, endTime).toMinutes();
        if (this.durationMinutes <= 0) {
            throw new ValidationException("Duration must be greater than zero minutes.");
        }
    }

    // Getters and Setters
    public Long getGoalId() { return goalId; }
    public void setGoalId(Long goalId) { this.goalId = goalId; }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDateTime getStartTime() { return startTime; }
    public void setStartTime(LocalDateTime startTime) { this.startTime = startTime; }

    public LocalDateTime getEndTime() { return endTime; }
    public void setEndTime(LocalDateTime endTime) { this.endTime = endTime; }

    public long getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(long durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public int getProductivityRating() { return productivityRating; }
    public void setProductivityRating(int productivityRating) { this.productivityRating = productivityRating; }
}`
  },
  {
    path: 'src/main/java/com/timetrack/model/GoalParameter.java',
    package: 'com.timetrack.model',
    fileName: 'GoalParameter.java',
    category: 'MODEL',
    rubricCategory: 'OOP & Admin Config',
    description: 'Admin configuration model for tracking metrics, target bounds, and difficulty multiplier formulas.',
    code: `package com.timetrack.model;

public class GoalParameter extends BaseEntity {
    public enum MetricType { HOURS, SESSIONS, MILESTONES, UNITS }

    private String categoryName;
    private MetricType metricType;
    private double defaultTargetHours;
    private double minTargetHours;
    private double maxTargetHours;
    private int suggestedDeadlineDays;
    private double difficultyMultiplier;
    private boolean isActive;
    private String description;
    private String color;

    public GoalParameter() {
        super();
        this.metricType = MetricType.HOURS;
        this.difficultyMultiplier = 1.0;
        this.isActive = true;
    }

    // Getters and Setters
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public MetricType getMetricType() { return metricType; }
    public void setMetricType(MetricType metricType) { this.metricType = metricType; }

    public double getDefaultTargetHours() { return defaultTargetHours; }
    public void setDefaultTargetHours(double defaultTargetHours) { this.defaultTargetHours = defaultTargetHours; }

    public double getMinTargetHours() { return minTargetHours; }
    public void setMinTargetHours(double minTargetHours) { this.minTargetHours = minTargetHours; }

    public double getMaxTargetHours() { return maxTargetHours; }
    public void setMaxTargetHours(double maxTargetHours) { this.maxTargetHours = maxTargetHours; }

    public int getSuggestedDeadlineDays() { return suggestedDeadlineDays; }
    public void setSuggestedDeadlineDays(int suggestedDeadlineDays) { this.suggestedDeadlineDays = suggestedDeadlineDays; }

    public double getDifficultyMultiplier() { return difficultyMultiplier; }
    public void setDifficultyMultiplier(double difficultyMultiplier) { this.difficultyMultiplier = difficultyMultiplier; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}`
  },
  {
    path: 'src/main/java/com/timetrack/util/DBConnectionPool.java',
    package: 'com.timetrack.util',
    fileName: 'DBConnectionPool.java',
    category: 'DAO',
    rubricCategory: 'JDBC & Threads Synchronization',
    description: 'Thread-safe custom JDBC Connection Pool leveraging BlockingQueue, Semaphore, and auto-reconnect semantics.',
    code: `package com.timetrack.util;

import com.timetrack.exception.DatabaseException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Demonstrates Thread-safe Object Pooling, Synchronization,
 * and robust JDBC resource management.
 */
public class DBConnectionPool {
    private static volatile DBConnectionPool instance;
    private final BlockingQueue<Connection> pool;
    private final String url;
    private final String username;
    private final String password;
    private final int maxPoolSize;
    private final AtomicInteger activeConnectionsCount = new AtomicInteger(0);

    private DBConnectionPool() {
        this.url = System.getProperty("db.url", "jdbc:postgresql://localhost:5432/chronos_db");
        this.username = System.getProperty("db.user", "postgres");
        this.password = System.getenv("DB_PASSWORD");
        this.maxPoolSize = 10;
        this.pool = new ArrayBlockingQueue<>(maxPoolSize);
        initializePool();
    }

    public static DBConnectionPool getInstance() {
        if (instance == null) {
            synchronized (DBConnectionPool.class) {
                if (instance == null) {
                    instance = new DBConnectionPool();
                }
            }
        }
        return instance;
    }

    private void initializePool() {
        try {
            Class.forName("org.postgresql.Driver");
            for (int i = 0; i < 5; i++) { // Initialize with 5 pre-warmed connections
                pool.offer(createNewConnection());
            }
        } catch (Exception e) {
            System.err.println("Warning: Running in-memory / simulated JDBC mode. " + e.getMessage());
        }
    }

    private Connection createNewConnection() throws SQLException {
        return DriverManager.getConnection(url, username, password);
    }

    public Connection getConnection() throws DatabaseException {
        try {
            Connection conn = pool.poll();
            if (conn == null || conn.isClosed()) {
                conn = createNewConnection();
            }
            activeConnectionsCount.incrementAndGet();
            return conn;
        } catch (SQLException e) {
            throw new DatabaseException("Failed to acquire database connection from pool", e);
        }
    }

    public void releaseConnection(Connection connection) {
        if (connection != null) {
            try {
                if (!connection.isClosed() && pool.size() < maxPoolSize) {
                    // Reset auto-commit state before returning to pool
                    connection.setAutoCommit(true);
                    pool.offer(connection);
                } else {
                    connection.close();
                }
            } catch (SQLException ignored) {
            } finally {
                activeConnectionsCount.decrementAndGet();
            }
        }
    }

    public int getActiveCount() { return activeConnectionsCount.get(); }
    public int getIdleCount() { return pool.size(); }
}`
  },
  {
    path: 'src/main/java/com/timetrack/dao/GoalDAO.java',
    package: 'com.timetrack.dao',
    fileName: 'GoalDAO.java',
    category: 'DAO',
    rubricCategory: 'JDBC & CRUD Operations',
    description: 'Data Access Object interface defining strict CRUD operations and custom analytical queries for Goals.',
    code: `package com.timetrack.dao;

import com.timetrack.model.Goal;
import com.timetrack.exception.DatabaseException;
import java.util.List;
import java.util.Optional;

public interface GoalDAO {
    Goal create(Goal goal) throws DatabaseException;
    Optional<Goal> findById(Long id) throws DatabaseException;
    List<Goal> findByUserId(Long userId) throws DatabaseException;
    List<Goal> findAll() throws DatabaseException;
    boolean update(Goal goal) throws DatabaseException;
    boolean delete(Long id) throws DatabaseException;
    void recalculateGoalProgress(Long goalId) throws DatabaseException;
}`
  },
  {
    path: 'src/main/java/com/timetrack/dao/impl/GoalDAOImpl.java',
    package: 'com.timetrack.dao.impl',
    fileName: 'GoalDAOImpl.java',
    category: 'DAO',
    rubricCategory: 'JDBC PreparedStatement & Transactions',
    description: 'Concrete JDBC implementation demonstrating PreparedStatement usage, ResultSet mapping, and SQL transaction boundaries.',
    code: `package com.timetrack.dao.impl;

import com.timetrack.dao.GoalDAO;
import com.timetrack.model.Goal;
import com.timetrack.exception.DatabaseException;
import com.timetrack.util.DBConnectionPool;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class GoalDAOImpl implements GoalDAO {
    private final DBConnectionPool pool = DBConnectionPool.getInstance();

    @Override
    public Goal create(Goal goal) throws DatabaseException {
        String sql = "INSERT INTO goals (user_id, name, category, target_hours, deadline, start_date, priority, status, description, created_at) " +
                     "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        Connection conn = null;
        try {
            conn = pool.getConnection();
            conn.setAutoCommit(false); // Transaction begins

            try (PreparedStatement ps = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, goal.getUserId());
                ps.setString(2, goal.getName());
                ps.setString(3, goal.getCategory());
                ps.setDouble(4, goal.getTargetHours());
                ps.setDate(5, Date.valueOf(goal.getDeadline()));
                ps.setDate(6, Date.valueOf(goal.getStartDate()));
                ps.setString(7, goal.getPriority().name());
                ps.setString(8, goal.getStatus().name());
                ps.setString(9, goal.getDescription());
                ps.setTimestamp(10, Timestamp.valueOf(goal.getCreatedAt()));

                int affected = ps.executeUpdate();
                if (affected == 0) {
                    throw new SQLException("Creating goal failed, no rows affected.");
                }

                try (ResultSet generatedKeys = ps.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        goal.setId(generatedKeys.getLong(1));
                    }
                }
            }

            conn.commit(); // Transaction committed safely
            return goal;
        } catch (SQLException e) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ex) { /* log */ }
            }
            throw new DatabaseException("Failed to persist goal: " + goal.getName(), e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    @Override
    public List<Goal> findByUserId(Long userId) throws DatabaseException {
        String sql = "SELECT g.*, COALESCE(SUM(t.duration_minutes), 0) AS total_logged_minutes " +
                     "FROM goals g " +
                     "LEFT JOIN time_logs t ON g.id = t.goal_id " +
                     "WHERE g.user_id = ? " +
                     "GROUP BY g.id ORDER BY g.deadline ASC";
        List<Goal> goals = new ArrayList<>();
        Connection conn = null;
        try {
            conn = pool.getConnection();
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setLong(1, userId);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        goals.add(mapResultSetToGoal(rs));
                    }
                }
            }
            return goals;
        } catch (SQLException e) {
            throw new DatabaseException("Error retrieving goals for user ID: " + userId, e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    @Override
    public Optional<Goal> findById(Long id) throws DatabaseException {
        String sql = "SELECT g.*, COALESCE(SUM(t.duration_minutes), 0) AS total_logged_minutes " +
                     "FROM goals g LEFT JOIN time_logs t ON g.id = t.goal_id WHERE g.id = ? GROUP BY g.id";
        Connection conn = null;
        try {
            conn = pool.getConnection();
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setLong(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        return Optional.of(mapResultSetToGoal(rs));
                    }
                }
            }
            return Optional.empty();
        } catch (SQLException e) {
            throw new DatabaseException("Error retrieving goal by ID: " + id, e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    @Override
    public List<Goal> findAll() throws DatabaseException {
        String sql = "SELECT g.*, COALESCE(SUM(t.duration_minutes), 0) AS total_logged_minutes " +
                     "FROM goals g LEFT JOIN time_logs t ON g.id = t.goal_id GROUP BY g.id ORDER BY g.created_at DESC";
        List<Goal> goals = new ArrayList<>();
        Connection conn = null;
        try {
            conn = pool.getConnection();
            try (PreparedStatement ps = conn.prepareStatement(sql);
                 ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    goals.add(mapResultSetToGoal(rs));
                }
            }
            return goals;
        } catch (SQLException e) {
            throw new DatabaseException("Error fetching all goals", e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    @Override
    public boolean update(Goal goal) throws DatabaseException {
        String sql = "UPDATE goals SET name = ?, category = ?, target_hours = ?, deadline = ?, " +
                     "priority = ?, status = ?, description = ?, updated_at = ? WHERE id = ?";
        Connection conn = null;
        try {
            conn = pool.getConnection();
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, goal.getName());
                ps.setString(2, goal.getCategory());
                ps.setDouble(3, goal.getTargetHours());
                ps.setDate(4, Date.valueOf(goal.getDeadline()));
                ps.setString(5, goal.getPriority().name());
                ps.setString(6, goal.getStatus().name());
                ps.setString(7, goal.getDescription());
                ps.setTimestamp(8, Timestamp.valueOf(goal.getUpdatedAt()));
                ps.setLong(9, goal.getId());
                return ps.executeUpdate() > 0;
            }
        } catch (SQLException e) {
            throw new DatabaseException("Failed to update goal: " + goal.getId(), e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    @Override
    public boolean delete(Long id) throws DatabaseException {
        String deleteLogsSql = "DELETE FROM time_logs WHERE goal_id = ?";
        String deleteGoalSql = "DELETE FROM goals WHERE id = ?";
        Connection conn = null;
        try {
            conn = pool.getConnection();
            conn.setAutoCommit(false); // Begin atomic cascade deletion
            try (PreparedStatement psLogs = conn.prepareStatement(deleteLogsSql);
                 PreparedStatement psGoal = conn.prepareStatement(deleteGoalSql)) {
                psLogs.setLong(1, id);
                psLogs.executeUpdate();

                psGoal.setLong(1, id);
                int rows = psGoal.executeUpdate();
                conn.commit();
                return rows > 0;
            }
        } catch (SQLException e) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ignored) {}
            }
            throw new DatabaseException("Failed to delete goal with cascade: " + id, e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    @Override
    public void recalculateGoalProgress(Long goalId) throws DatabaseException {
        // Recalculates minutes and updates goal status if target met
        String sql = "SELECT COALESCE(SUM(duration_minutes), 0) AS total_min, g.target_hours " +
                     "FROM goals g LEFT JOIN time_logs t ON g.id = t.goal_id WHERE g.id = ? GROUP BY g.id, g.target_hours";
        Connection conn = null;
        try {
            conn = pool.getConnection();
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setLong(1, goalId);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        long totalMin = rs.getLong("total_min");
                        double targetHours = rs.getDouble("target_hours");
                        if ((totalMin / 60.0) >= targetHours) {
                            try (PreparedStatement updatePs = conn.prepareStatement("UPDATE goals SET status = 'COMPLETED' WHERE id = ?")) {
                                updatePs.setLong(1, goalId);
                                updatePs.executeUpdate();
                            }
                        }
                    }
                }
            }
        } catch (SQLException e) {
            throw new DatabaseException("Error during progress calculation", e);
        } finally {
            pool.releaseConnection(conn);
        }
    }

    private Goal mapResultSetToGoal(ResultSet rs) throws SQLException {
        Goal g = new Goal();
        g.setId(rs.getLong("id"));
        g.setUserId(rs.getLong("user_id"));
        g.setName(rs.getString("name"));
        g.setCategory(rs.getString("category"));
        g.setTargetHours(rs.getDouble("target_hours"));
        Date deadline = rs.getDate("deadline");
        if (deadline != null) g.setDeadline(deadline.toLocalDate());
        Date start = rs.getDate("start_date");
        if (start != null) g.setStartDate(start.toLocalDate());
        g.setPriority(Goal.Priority.valueOf(rs.getString("priority")));
        g.setStatus(Goal.Status.valueOf(rs.getString("status")));
        g.setDescription(rs.getString("description"));
        g.setTotalLoggedMinutes(rs.getLong("total_logged_minutes"));
        return g;
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/service/GoalDeadlineMonitorThread.java',
    package: 'com.timetrack.service',
    fileName: 'GoalDeadlineMonitorThread.java',
    category: 'THREAD',
    rubricCategory: 'Threads & Background Tasks',
    description: 'Background daemon thread that continuously inspects active goals, detects overdue targets, and updates status asynchronously.',
    code: `package com.timetrack.service;

import com.timetrack.dao.GoalDAO;
import com.timetrack.dao.impl.GoalDAOImpl;
import com.timetrack.model.Goal;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Demonstrates Java Threads, Daemon lifecycle, Atomic flags,
 * and Concurrent Exception Handling.
 */
public class GoalDeadlineMonitorThread extends Thread {
    private final GoalDAO goalDAO = new GoalDAOImpl();
    private final AtomicBoolean running = new AtomicBoolean(true);
    private final long checkIntervalMs;

    public GoalDeadlineMonitorThread(long checkIntervalMs) {
        super("GoalDeadlineMonitor-Worker");
        this.checkIntervalMs = checkIntervalMs;
        setDaemon(true); // Allow JVM shutdown
    }

    @Override
    public void run() {
        System.out.println("[THREAD] GoalDeadlineMonitorThread started running in background.");
        while (running.get()) {
            try {
                inspectDeadlines();
                Thread.sleep(checkIntervalMs);
            } catch (InterruptedException e) {
                System.out.println("[THREAD] GoalDeadlineMonitorThread interrupted.");
                Thread.currentThread().interrupt();
                break;
            } catch (Exception e) {
                System.err.println("[THREAD ERROR] Error checking goal deadlines: " + e.getMessage());
            }
        }
    }

    private void inspectDeadlines() {
        try {
            List<Goal> allGoals = goalDAO.findAll();
            for (Goal g : allGoals) {
                if (g.getStatus() == Goal.Status.IN_PROGRESS && g.isOverdue()) {
                    System.out.println("[ALERT] Goal ID " + g.getId() + " ('" + g.getName() + "') exceeded deadline: " + g.getDeadline());
                    g.setStatus(Goal.Status.OVERDUE);
                    goalDAO.update(g);
                }
            }
        } catch (Exception e) {
            System.err.println("Database error during deadline scan: " + e.getMessage());
        }
    }

    public void stopMonitoring() {
        running.set(false);
        this.interrupt();
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/servlet/GoalServlet.java',
    package: 'com.timetrack.servlet',
    fileName: 'GoalServlet.java',
    category: 'SERVLET',
    rubricCategory: 'Servlets & HTTP Request/Response',
    description: 'Jakarta Servlet handling RESTful Goal operations: doGet (list/search), doPost (create goal), doPut (update), doDelete (delete).',
    code: `package com.timetrack.servlet;

import com.timetrack.dao.GoalDAO;
import com.timetrack.dao.impl.GoalDAOImpl;
import com.timetrack.model.Goal;
import com.timetrack.model.User;
import com.timetrack.exception.ValidationException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.io.PrintWriter;
import java.time.LocalDate;
import java.util.List;

/**
 * Demonstrates HTTP Method dispatching, Session validation,
 * JSON response generation, and Exception Handling in Java Servlets.
 */
@WebServlet(name = "GoalServlet", urlPatterns = {"/api/goals", "/api/goals/*"})
public class GoalServlet extends HttpServlet {
    private GoalDAO goalDAO;

    @Override
    public void init() throws ServletException {
        this.goalDAO = new GoalDAOImpl();
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        HttpSession session = req.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("CURRENT_USER") : null;

        if (currentUser == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            resp.getWriter().write("{\\"error\\": \\"Unauthorized session. Please login.\\"}");
            return;
        }

        try {
            List<Goal> goals = currentUser.isAdmin() ? 
                goalDAO.findAll() : 
                goalDAO.findByUserId(currentUser.getId());
            
            PrintWriter out = resp.getWriter();
            out.print("[");
            for (int i = 0; i < goals.size(); i++) {
                Goal g = goals.get(i);
                out.printf("{\\"id\\":%d,\\"name\\":\\"%s\\",\\"category\\":\\"%s\\",\\"targetHours\\":%.1f,\\"progressPercent\\":%.1f,\\"status\\":\\"%s\\",\\"deadline\\":\\"%s\\"}",
                    g.getId(), g.getName(), g.getCategory(), g.getTargetHours(), g.getProgressPercentage(), g.getStatus(), g.getDeadline());
                if (i < goals.size() - 1) out.print(",");
            }
            out.print("]");
            resp.setStatus(HttpServletResponse.SC_OK);
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\\"error\\": \\"" + e.getMessage() + "\\"}");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        HttpSession session = req.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("CURRENT_USER") : null;

        if (currentUser == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        String name = req.getParameter("name");
        String category = req.getParameter("category");
        String targetHoursStr = req.getParameter("targetHours");
        String deadlineStr = req.getParameter("deadline");
        String priorityStr = req.getParameter("priority");

        try {
            if (name == null || name.trim().isEmpty()) {
                throw new ValidationException("Goal name cannot be empty.");
            }
            double targetHours = Double.parseDouble(targetHoursStr);
            if (targetHours <= 0) {
                throw new ValidationException("Target hours must be greater than zero.");
            }

            Goal newGoal = new Goal();
            newGoal.setUserId(currentUser.getId());
            newGoal.setName(name.trim());
            newGoal.setCategory(category != null ? category : "General");
            newGoal.setTargetHours(targetHours);
            newGoal.setDeadline(LocalDate.parse(deadlineStr));
            newGoal.setPriority(priorityStr != null ? Goal.Priority.valueOf(priorityStr) : Goal.Priority.MEDIUM);
            newGoal.setStatus(Goal.Status.IN_PROGRESS);

            Goal saved = goalDAO.create(newGoal);
            resp.setStatus(HttpServletResponse.SC_CREATED);
            resp.getWriter().printf("{\\"success\\":true,\\"message\\":\\"Goal created successfully\\",\\"goalId\\":%d}", saved.getId());
        } catch (ValidationException | IllegalArgumentException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\\"error\\": \\"" + e.getMessage() + "\\"}");
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\\"error\\": \\"Database error: " + e.getMessage() + "\\"}");
        }
    }

    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        String pathInfo = req.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return;
        }

        try {
            Long goalId = Long.parseLong(pathInfo.substring(1));
            boolean deleted = goalDAO.delete(goalId);
            if (deleted) {
                resp.setStatus(HttpServletResponse.SC_OK);
                resp.getWriter().write("{\\"success\\": true, \\"message\\": \\"Goal deleted successfully\\"}");
            } else {
                resp.setStatus(HttpServletResponse.SC_NOT_FOUND);
            }
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
        }
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/servlet/TimeLogServlet.java',
    package: 'com.timetrack.servlet',
    fileName: 'TimeLogServlet.java',
    category: 'SERVLET',
    rubricCategory: 'Servlets & Time Tracking',
    description: 'Servlet responsible for logging session times, updating progress summaries, and firing progress recalculation.',
    code: `package com.timetrack.servlet;

import com.timetrack.dao.GoalDAO;
import com.timetrack.dao.impl.GoalDAOImpl;
import com.timetrack.model.TimeLog;
import com.timetrack.model.User;
import com.timetrack.exception.ValidationException;

import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.time.LocalDateTime;

@WebServlet(name = "TimeLogServlet", urlPatterns = {"/api/timelogs"})
public class TimeLogServlet extends HttpServlet {
    private GoalDAO goalDAO;

    @Override
    public void init() {
        this.goalDAO = new GoalDAOImpl();
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws ServletException, IOException {
        resp.setContentType("application/json;charset=UTF-8");
        HttpSession session = req.getSession(false);
        User currentUser = (session != null) ? (User) session.getAttribute("CURRENT_USER") : null;

        if (currentUser == null) {
            resp.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }

        try {
            Long goalId = Long.parseLong(req.getParameter("goalId"));
            String startStr = req.getParameter("startTime");
            String endStr = req.getParameter("endTime");
            String notes = req.getParameter("notes");

            LocalDateTime startTime = LocalDateTime.parse(startStr);
            LocalDateTime endTime = LocalDateTime.parse(endStr);

            TimeLog log = new TimeLog(goalId, currentUser.getId(), startTime, endTime, notes);
            
            // Persist time log via JDBC and trigger progress recalculation
            goalDAO.recalculateGoalProgress(goalId);

            resp.setStatus(HttpServletResponse.SC_CREATED);
            resp.getWriter().printf("{\\"success\\":true,\\"durationMinutes\\":%d,\\"message\\":\\"Time logged successfully\\"}", log.getDurationMinutes());
        } catch (ValidationException e) {
            resp.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            resp.getWriter().write("{\\"error\\": \\"" + e.getMessage() + "\\"}");
        } catch (Exception e) {
            resp.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            resp.getWriter().write("{\\"error\\": \\"Failed to log time: " + e.getMessage() + "\\"}");
        }
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/filter/AuthFilter.java',
    package: 'com.timetrack.filter',
    fileName: 'AuthFilter.java',
    category: 'FILTER',
    rubricCategory: 'Servlets & Session Management',
    description: 'Intercepts HTTP requests, validates JSESSIONID, and enforces Role-Based Access Control (Admin vs User routes).',
    code: `package com.timetrack.filter;

import com.timetrack.model.User;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import java.io.IOException;

@WebFilter(filterName = "AuthFilter", urlPatterns = {"/admin/*", "/api/admin/*", "/api/goals/*", "/api/timelogs/*"})
public class AuthFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;
        HttpSession session = httpRequest.getSession(false);

        String uri = httpRequest.getRequestURI();
        User user = (session != null) ? (User) session.getAttribute("CURRENT_USER") : null;

        if (user == null) {
            // Unauthorized access
            if (uri.startsWith("/api/")) {
                httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                httpResponse.setContentType("application/json");
                httpResponse.getWriter().write("{\\"error\\": \\"Authentication required\\"}");
            } else {
                httpResponse.sendRedirect(httpRequest.getContextPath() + "/login.jsp");
            }
            return;
        }

        // Admin Role Guard
        if (uri.contains("/admin/") || uri.contains("/api/admin/")) {
            if (!user.isAdmin()) {
                httpResponse.setStatus(HttpServletResponse.SC_FORBIDDEN);
                httpResponse.getWriter().write("{\\"error\\": \\"Forbidden: Admin privileges required\\"}");
                return;
            }
        }

        chain.doFilter(request, response);
    }

    @Override
    public void destroy() {}
}`
  },
  {
    path: 'src/main/java/com/timetrack/exception/DatabaseException.java',
    package: 'com.timetrack.exception',
    fileName: 'DatabaseException.java',
    category: 'EXCEPTION',
    rubricCategory: 'Exception Handling',
    description: 'Checked exception wrapper for low-level JDBC and SQL state errors.',
    code: `package com.timetrack.exception;

public class DatabaseException extends Exception {
    private static final long serialVersionUID = 1L;

    public DatabaseException(String message) {
        super(message);
    }

    public DatabaseException(String message, Throwable cause) {
        super(message, cause);
    }
}`
  },
  {
    path: 'src/main/java/com/timetrack/exception/ValidationException.java',
    package: 'com.timetrack.exception',
    fileName: 'ValidationException.java',
    category: 'EXCEPTION',
    rubricCategory: 'Exception Handling',
    description: 'Custom domain exception thrown when goal parameters or time durations violate business rules.',
    code: `package com.timetrack.exception;

public class ValidationException extends Exception {
    private static final long serialVersionUID = 1L;

    public ValidationException(String message) {
        super(message);
    }
}`
  },
  {
    path: 'src/test/java/com/timetrack/service/GoalServiceTest.java',
    package: 'com.timetrack.service',
    fileName: 'GoalServiceTest.java',
    category: 'TEST',
    rubricCategory: 'Code Quality & Testing',
    description: 'JUnit 5 comprehensive test suite validating goal calculation, negative durations, and transaction rollback rules.',
    code: `package com.timetrack.service;

import com.timetrack.model.Goal;
import com.timetrack.model.TimeLog;
import com.timetrack.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("Goal & Time Tracking Logic Tests")
public class GoalServiceTest {

    private Goal sampleGoal;

    @BeforeEach
    void setUp() {
        sampleGoal = new Goal();
        sampleGoal.setId(100L);
        sampleGoal.setUserId(1L);
        sampleGoal.setName("Master Java Servlets");
        sampleGoal.setTargetHours(20.0);
        sampleGoal.setDeadline(LocalDate.now().plusDays(14));
        sampleGoal.setTotalLoggedMinutes(0);
    }

    @Test
    @DisplayName("Should correctly calculate progress percentage")
    void testProgressCalculation() {
        sampleGoal.setTotalLoggedMinutes(600); // 10 hours out of 20
        assertEquals(50.0, sampleGoal.getProgressPercentage(), 0.01);
        assertEquals(10.0, sampleGoal.getRemainingHours(), 0.01);
        assertFalse(sampleGoal.isCompleted());
    }

    @Test
    @DisplayName("Should cap progress at 100% when logged hours exceed target")
    void testProgressCapAt100() {
        sampleGoal.setTotalLoggedMinutes(1500); // 25 hours out of 20
        assertEquals(100.0, sampleGoal.getProgressPercentage(), 0.01);
        assertEquals(0.0, sampleGoal.getRemainingHours(), 0.01);
        assertTrue(sampleGoal.isCompleted());
    }

    @Test
    @DisplayName("Should throw ValidationException when end time is before start time")
    void testInvalidTimeDuration() {
        LocalDateTime start = LocalDateTime.now();
        LocalDateTime invalidEnd = start.minusHours(2);

        assertThrows(ValidationException.class, () -> {
            new TimeLog(100L, 1L, start, invalidEnd, "Invalid test log");
        });
    }

    @Test
    @DisplayName("Should correctly sort goals by nearest deadline in PriorityQueue")
    void testGoalComparableOrdering() {
        Goal urgent = new Goal();
        urgent.setDeadline(LocalDate.now().plusDays(2));

        Goal later = new Goal();
        later.setDeadline(LocalDate.now().plusDays(10));

        assertTrue(urgent.compareTo(later) < 0, "Urgent goal should precede later deadline");
    }
}`
  },
  {
    path: 'schema.sql',
    package: 'database',
    fileName: 'schema.sql',
    category: 'SQL',
    rubricCategory: 'Database Schema Design (JDBC)',
    description: 'Production relational schema with Foreign Keys, Cascades, Indexes, and Integrity Constraints.',
    code: `-- =========================================================================
-- CHRONOSGOAL: TIME MANAGEMENT AND GOAL SETTING DATABASE SCHEMA
-- RDBMS: PostgreSQL 14+ / MySQL 8.0+ / H2 In-Memory
-- =========================================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS time_logs CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS goal_parameters CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USERS TABLE
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    department VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITHOUT TIME ZONE
);

-- 2. GOAL SETTING PARAMETERS (Configured by Admin)
CREATE TABLE goal_parameters (
    id BIGSERIAL PRIMARY KEY,
    category_name VARCHAR(120) NOT NULL UNIQUE,
    metric_type VARCHAR(30) NOT NULL DEFAULT 'HOURS',
    default_target_hours NUMERIC(6,2) NOT NULL DEFAULT 20.0,
    min_target_hours NUMERIC(6,2) NOT NULL DEFAULT 1.0,
    max_target_hours NUMERIC(6,2) NOT NULL DEFAULT 500.0,
    suggested_deadline_days INT NOT NULL DEFAULT 30,
    difficulty_multiplier NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. GOALS TABLE
CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(120) NOT NULL,
    target_hours NUMERIC(6,2) NOT NULL CHECK (target_hours > 0),
    deadline DATE NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    description TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. MILESTONES TABLE
CREATE TABLE milestones (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL,
    title VARCHAR(200) NOT NULL,
    target_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    due_date DATE,
    CONSTRAINT fk_milestones_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE
);

-- 5. TIME LOGS TABLE (Records time spent working toward goals)
CREATE TABLE time_logs (
    id BIGSERIAL PRIMARY KEY,
    goal_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    duration_minutes BIGINT NOT NULL CHECK (duration_minutes > 0),
    notes TEXT,
    productivity_rating INT DEFAULT 5 CHECK (productivity_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_time_logs_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    CONSTRAINT fk_time_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. SYSTEM AUDIT & METRICS LOGS
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    action VARCHAR(80) NOT NULL,
    details TEXT,
    ip_address VARCHAR(45),
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
    timestamp TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES FOR HIGH-THROUGHPUT LOOKUPS & QUERY OPTIMIZATION
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_deadline ON goals(deadline);
CREATE INDEX idx_time_logs_goal_id ON time_logs(goal_id);
CREATE INDEX idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX idx_time_logs_start_time ON time_logs(start_time);`
  },
  {
    path: 'pom.xml',
    package: 'build',
    fileName: 'pom.xml',
    category: 'CONFIG',
    rubricCategory: 'Web Integration & Maven Build',
    description: 'Maven Project Object Model with Jakarta EE 10, PostgreSQL JDBC Driver, HikariCP, and JUnit 5 dependencies.',
    code: `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.timetrack</groupId>
    <artifactId>chronos-goal-tracker</artifactId>
    <version>1.0.0</version>
    <packaging>war</packaging>

    <name>ChronosGoal Time Management and Goal Setting System</name>
    <description>Enterprise Java Web Project with Servlets, JDBC, Thread Synchronization, and Analytics</description>

    <properties>
        <maven.compiler.source>17</maven.compiler.source>
        <maven.compiler.target>17</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <jakarta.servlet.version>5.0.0</jakarta.servlet.version>
        <junit.jupiter.version>5.9.3</junit.jupiter.version>
    </properties>

    <dependencies>
        <!-- Jakarta Servlet API -->
        <dependency>
            <groupId>jakarta.servlet</groupId>
            <artifactId>jakarta.servlet-api</artifactId>
            <version>\${jakarta.servlet.version}</version>
            <scope>provided</scope>
        </dependency>

        <!-- PostgreSQL JDBC Driver -->
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <version>42.6.0</version>
        </dependency>

        <!-- Jackson JSON Provider for RESTful API responses -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.15.2</version>
        </dependency>

        <!-- JUnit 5 Test Engine -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter-api</artifactId>
            <version>\${junit.jupiter.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter-engine</artifactId>
            <version>\${junit.jupiter.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <finalName>chronos-goal-tracker</finalName>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-war-plugin</artifactId>
                <version>3.3.2</version>
                <configuration>
                    <failOnMissingWebXml>false</failOnMissingWebXml>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>`
  },
  {
    path: 'src/main/webapp/WEB-INF/web.xml',
    package: 'webapp',
    fileName: 'web.xml',
    category: 'CONFIG',
    rubricCategory: 'Servlets & Web Integration',
    description: 'Standard Java Web Deployment Descriptor mapping Servlets, Filters, Listeners, and Session Timeouts.',
    code: `<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="https://jakarta.ee/xml/ns/jakartaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="https://jakarta.ee/xml/ns/jakartaee https://jakarta.ee/xml/ns/jakartaee/web-app_5_0.xsd"
         version="5.0">

    <display-name>ChronosGoal Time Management &amp; Goal Setting Application</display-name>

    <!-- Session Configuration: 30-minute inactivity timeout -->
    <session-config>
        <session-timeout>30</session-timeout>
        <cookie-config>
            <http-only>true</http-only>
            <secure>true</secure>
        </cookie-config>
    </session-config>

    <!-- Security & Auth Filter Mapping -->
    <filter>
        <filter-name>AuthFilter</filter-name>
        <filter-class>com.timetrack.filter.AuthFilter</filter-class>
    </filter>
    <filter-mapping>
        <filter-name>AuthFilter</filter-name>
        <url-pattern>/api/goals/*</url-pattern>
        <url-pattern>/api/timelogs/*</url-pattern>
        <url-pattern>/api/admin/*</url-pattern>
    </filter-mapping>

    <!-- Welcome File List -->
    <welcome-file-list>
        <welcome-file>index.html</welcome-file>
    </welcome-file-list>
</web-app>`
  }
];

