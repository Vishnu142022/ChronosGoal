CREATE DATABASE IF NOT EXISTS discipline_os_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE discipline_os_db;

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(100) NOT NULL,
    role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
    status ENUM('ACTIVE', 'SUSPENDED', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_users_status_role (status, role)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goals (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    category VARCHAR(80) NOT NULL,
    target_hours DECIMAL(9,2) NOT NULL,
    deadline DATE NOT NULL,
    start_date DATE NOT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    status ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'PAUSED') NOT NULL DEFAULT 'NOT_STARTED',
    description TEXT NULL,
    total_logged_minutes INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_goals_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_goals_target_hours CHECK (target_hours > 0),
    INDEX idx_goals_user_deadline (user_id, deadline)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goal_steps (
    id VARCHAR(64) PRIMARY KEY,
    goal_id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    deadline DATE NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    step_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_goal_steps_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    INDEX idx_goal_steps_order (goal_id, step_order)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS time_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    goal_id VARCHAR(64) NOT NULL,
    log_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT UNSIGNED NOT NULL,
    notes TEXT NULL,
    productivity_rating TINYINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_time_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_time_logs_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    CONSTRAINT chk_time_logs_duration CHECK (duration_minutes > 0),
    CONSTRAINT chk_time_logs_rating CHECK (productivity_rating IS NULL OR productivity_rating BETWEEN 1 AND 5),
    INDEX idx_time_logs_user_date (user_id, log_date, created_at),
    INDEX idx_time_logs_goal (goal_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    due_date DATE NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_tasks_user_due (user_id, due_date, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habits (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    category VARCHAR(100) NOT NULL,
    category_color CHAR(7) NOT NULL DEFAULT '#A855F7',
    frequency VARCHAR(16) NOT NULL DEFAULT 'DAILY',
    time_of_day VARCHAR(16) NULL,
    reminder VARCHAR(80) NULL,
    start_date DATE NULL,
    weekly_target INT UNSIGNED NULL,
    monthly_target INT UNSIGNED NULL,
    monthly_unit VARCHAR(40) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_habits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_habits_id_user (id, user_id),
    INDEX idx_habits_user_created (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS habit_logs (
    habit_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    log_date DATE NOT NULL,
    status ENUM('COMPLETED', 'FROZEN', 'MISSED') NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (habit_id, log_date),
    CONSTRAINT fk_habit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_habit_logs_habit_user FOREIGN KEY (habit_id, user_id)
        REFERENCES habits(id, user_id) ON DELETE CASCADE,
    INDEX idx_habit_logs_user_date (user_id, log_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS goal_parameters (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    metric_type ENUM('HOURS', 'SESSIONS', 'MILESTONES', 'PAGES_OR_UNITS') NOT NULL DEFAULT 'HOURS',
    default_target_hours DECIMAL(9,2) NOT NULL,
    min_target_hours DECIMAL(9,2) NOT NULL,
    max_target_hours DECIMAL(9,2) NOT NULL,
    suggested_deadline_days INT UNSIGNED NOT NULL,
    difficulty_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NULL,
    color CHAR(7) NOT NULL DEFAULT '#8B5CF6',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_goal_parameter_target CHECK (min_target_hours > 0 AND default_target_hours BETWEEN min_target_hours AND max_target_hours),
    INDEX idx_goal_parameters_active (is_active, category_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS usage_events (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(64) NULL,
    tool VARCHAR(60) NOT NULL,
    action VARCHAR(80) NOT NULL,
    duration_ms BIGINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_usage_events_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_usage_events_created (created_at),
    INDEX idx_usage_events_user (user_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    admin_id VARCHAR(64) NULL,
    target_user_id VARCHAR(64) NULL,
    action VARCHAR(80) NOT NULL,
    details VARCHAR(1000) NOT NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_admin FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_created (created_at)
) ENGINE=InnoDB;

DELIMITER //
-- Triggers keep denormalized progress synchronized in the same transaction as time-log changes.
DROP TRIGGER IF EXISTS trg_time_logs_after_insert//
CREATE TRIGGER trg_time_logs_after_insert
AFTER INSERT ON time_logs
FOR EACH ROW
BEGIN
    UPDATE goals
    SET total_logged_minutes = total_logged_minutes + NEW.duration_minutes
    WHERE id = NEW.goal_id;
    UPDATE goals
    SET status = CASE
        WHEN total_logged_minutes >= target_hours * 60 THEN 'COMPLETED'
        WHEN status = 'NOT_STARTED' THEN 'IN_PROGRESS'
        ELSE status
    END
    WHERE id = NEW.goal_id;
END//

DROP TRIGGER IF EXISTS trg_time_logs_after_update//
CREATE TRIGGER trg_time_logs_after_update
AFTER UPDATE ON time_logs
FOR EACH ROW
BEGIN
    IF OLD.goal_id = NEW.goal_id THEN
        UPDATE goals
        SET total_logged_minutes = total_logged_minutes - OLD.duration_minutes + NEW.duration_minutes
        WHERE id = NEW.goal_id;
        UPDATE goals
        SET status = CASE
            WHEN total_logged_minutes >= target_hours * 60 THEN 'COMPLETED'
            WHEN status = 'COMPLETED' THEN 'IN_PROGRESS'
            ELSE status
        END
        WHERE id = NEW.goal_id;
    ELSE
        UPDATE goals
        SET total_logged_minutes = total_logged_minutes - OLD.duration_minutes
        WHERE id = OLD.goal_id;
        UPDATE goals
        SET status = CASE
            WHEN total_logged_minutes >= target_hours * 60 THEN 'COMPLETED'
            WHEN status = 'COMPLETED' THEN 'IN_PROGRESS'
            ELSE status
        END
        WHERE id = OLD.goal_id;

        UPDATE goals
        SET total_logged_minutes = total_logged_minutes + NEW.duration_minutes
        WHERE id = NEW.goal_id;
        UPDATE goals
        SET status = CASE
            WHEN total_logged_minutes >= target_hours * 60 THEN 'COMPLETED'
            WHEN status IN ('NOT_STARTED', 'COMPLETED') THEN 'IN_PROGRESS'
            ELSE status
        END
        WHERE id = NEW.goal_id;
    END IF;
END//

DROP TRIGGER IF EXISTS trg_time_logs_after_delete//
CREATE TRIGGER trg_time_logs_after_delete
AFTER DELETE ON time_logs
FOR EACH ROW
BEGIN
    UPDATE goals
    SET total_logged_minutes = total_logged_minutes - OLD.duration_minutes
    WHERE id = OLD.goal_id;
    UPDATE goals
    SET status = CASE
        WHEN total_logged_minutes >= target_hours * 60 THEN 'COMPLETED'
        WHEN status = 'COMPLETED' THEN 'IN_PROGRESS'
        ELSE status
    END
    WHERE id = OLD.goal_id;
END//
DELIMITER ;

