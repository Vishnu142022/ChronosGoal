package com.disciplineos.service;

import com.disciplineos.config.DBConnection;
import com.disciplineos.dao.DataAccessException;

import java.sql.Connection;
import java.sql.Date;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Calculates authenticated-user analytics from time_logs and habit_logs.
 * InsightsServlet supplies the session owner; query parameters never select another user.
 */
public class InsightsReportService {

    /** Creates an insights report service. */
    public InsightsReportService() { }

    /**
     * Returns the overall, weekly, and streak summary for the requested date window.
     *
     * @param userId authenticated owner id
     * @param range supported date range label, such as {@code 30_DAYS}
     * @return JSON-ready summary object
     */
    public Map<String, Object> summary(String userId, String range) {
        LocalDate today = LocalDate.now();
        int days = rangeDays(range);
        Map<LocalDate, Counts> counts = counts(userId, today.minusDays(days - 1L), today);
        int total = counts.values().stream().mapToInt(Counts::total).sum();
        int completed = counts.values().stream().mapToInt(Counts::completed).sum();
        int thisWeek = rate(counts, today.minusDays(6), today);
        int lastWeek = rate(counts, today.minusDays(13), today.minusDays(7));
        List<Map<String, Object>> streaks = streaks(userId, today);
        Map<String, Object> best = streaks.stream()
                .max((left, right) -> Integer.compare((Integer) left.get("bestStreak"),
                        (Integer) right.get("bestStreak"))).orElse(Map.of());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("overallConsistency", percent(completed, total));
        result.put("thisWeekRate", thisWeek);
        result.put("lastWeekRate", lastWeek);
        result.put("diff", thisWeek - lastWeek);
        result.put("bestStreak", best.getOrDefault("bestStreak", 0));
        result.put("bestStreakHabit", best.getOrDefault("name", ""));
        result.put("totalLoggedMinutes", totalLoggedMinutes(userId, today.minusDays(days - 1L), today));
        return result;
    }

    /**
     * Returns per-day habit consistency for a calendar window.
     *
     * @param userId authenticated owner id
     * @param range supported date range label
     * @return ordered JSON-ready daily points
     */
    public List<Map<String, Object>> consistency(String userId, String range) {
        LocalDate today = LocalDate.now();
        int days = rangeDays(range);
        LocalDate start = today.minusDays(days - 1L);
        Map<LocalDate, Counts> counts = counts(userId, start, today);
        List<Map<String, Object>> points = new ArrayList<>();
        for (LocalDate date = start; !date.isAfter(today); date = date.plusDays(1)) {
            Counts count = counts.getOrDefault(date, new Counts(0, 0));
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("dateStr", date.toString());
            point.put("label", date.getMonth().toString().substring(0, 3) + " " + date.getDayOfMonth());
            point.put("consistency", percent(count.completed(), count.total()));
            point.put("completedCount", count.completed());
            point.put("totalCount", count.total());
            points.add(point);
        }
        return points;
    }

    /**
     * Returns each owned habit's current and historical streak.
     *
     * @param userId authenticated owner id
     * @param today current local date for streak calculations
     * @return streak list ordered by current streak
     */
    public List<Map<String, Object>> streaks(String userId, LocalDate today) {
        Map<String, Map<String, String>> histories = histories(userId);
        List<Map<String, Object>> result = new ArrayList<>();
        histories.forEach((key, history) -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("name", key.substring(key.indexOf(':') + 1));
            item.put("currentStreak", HabitProgress.currentStreak(history, today));
            item.put("bestStreak", HabitProgress.bestStreak(history));
            result.add(item);
        });
        result.sort((left, right) -> Integer.compare((Integer) right.get("currentStreak"),
                (Integer) left.get("currentStreak")));
        return result;
    }

    /**
     * Calculates a percentage without division by zero and rounds to an integer.
     *
     * @param completed completed habit-day count
     * @param total possible habit-day count
     * @return percentage from zero to one hundred
     */
    public static int percent(int completed, int total) {
        if (completed <= 0 || total <= 0) return 0;
        return Math.min(100, Math.round(completed * 100.0f / total));
    }

    private Map<LocalDate, Counts> counts(String userId, LocalDate start, LocalDate end) {
        String sql = """
                SELECT l.log_date,
                       SUM(CASE WHEN l.status IN ('COMPLETED', 'FROZEN') THEN 1 ELSE 0 END) AS done_count
                FROM habit_logs l JOIN habits h ON h.id = l.habit_id AND h.user_id = l.user_id
                WHERE h.user_id = ? AND l.log_date BETWEEN ? AND ?
                GROUP BY l.log_date
                """;
        Map<LocalDate, Counts> result = new LinkedHashMap<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            int habitCount = countHabits(connection, userId);
            for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
                result.put(date, new Counts(0, habitCount));
            }
            statement.setString(1, userId);
            statement.setDate(2, Date.valueOf(start));
            statement.setDate(3, Date.valueOf(end));
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    LocalDate date = rows.getDate("log_date").toLocalDate();
                    result.put(date, new Counts(rows.getInt("done_count"), result.get(date).total()));
                }
            }
            return result;
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to calculate habit consistency", exception);
        }
    }

    private int countHabits(Connection connection, String userId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM habits WHERE user_id = ?")) {
            statement.setString(1, userId);
            try (ResultSet row = statement.executeQuery()) {
                row.next();
                return row.getInt(1);
            }
        }
    }

    private Map<String, Map<String, String>> histories(String userId) {
        String sql = """
                SELECT h.id, h.name, l.log_date, l.status FROM habits h
                LEFT JOIN habit_logs l ON l.habit_id = h.id AND l.user_id = h.user_id
                WHERE h.user_id = ? ORDER BY h.id, l.log_date
                """;
        Map<String, Map<String, String>> result = new LinkedHashMap<>();
        Map<String, String> names = new LinkedHashMap<>();
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    String id = rows.getString("id");
                    names.put(id, rows.getString("name"));
                    Map<String, String> history = result.computeIfAbsent(id, ignored -> new LinkedHashMap<>());
                    Date date = rows.getDate("log_date");
                    if (date != null) history.put(date.toString(), rows.getString("status"));
                }
            }
            Map<String, Map<String, String>> named = new LinkedHashMap<>();
            result.forEach((id, history) -> named.put(id + ":" + names.get(id), history));
            return named;
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to calculate habit streaks", exception);
        }
    }

    private int totalLoggedMinutes(String userId, LocalDate start, LocalDate end) {
        String sql = """
                SELECT COALESCE(SUM(duration_minutes), 0) FROM time_logs
                WHERE user_id = ? AND log_date BETWEEN ? AND ?
                """;
        try (Connection connection = DBConnection.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, userId);
            statement.setDate(2, Date.valueOf(start));
            statement.setDate(3, Date.valueOf(end));
            try (ResultSet rows = statement.executeQuery()) {
                rows.next();
                return rows.getInt(1);
            }
        } catch (SQLException exception) {
            throw new DataAccessException("Unable to calculate tracked time", exception);
        }
    }

    private int rate(Map<LocalDate, Counts> counts, LocalDate start, LocalDate end) {
        int completed = 0;
        int total = 0;
        for (Map.Entry<LocalDate, Counts> entry : counts.entrySet()) {
            if (!entry.getKey().isBefore(start) && !entry.getKey().isAfter(end)) {
                completed += entry.getValue().completed();
                total += entry.getValue().total();
            }
        }
        return percent(completed, total);
    }

    private int rangeDays(String range) {
        if ("7_DAYS".equals(range)) return 7;
        if ("90_DAYS".equals(range)) return 90;
        return 30;
    }

    private record Counts(int completed, int total) { }
}

