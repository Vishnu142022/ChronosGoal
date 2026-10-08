package com.disciplineos.servlet;

import com.disciplineos.service.InsightsReportService;
import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.Map;

/**
 * Serves session-scoped consistency, streak, and summary analytics.
 * User identity is read from the authenticated session rather than query parameters.
 */
@WebServlet("/api/insights/*")
public class InsightsServlet extends ApiServlet {

    /** Creates the insights servlet. */
    public InsightsServlet() { }

    /** Service that computes analytics for the authenticated session owner. */
    private final InsightsReportService reportService = new InsightsReportService();

    /**
     * Handles {@code GET /api/insights/summary}, {@code /consistency}, {@code /streaks},
     * and {@code /leaderboard}.
     *
     * @param request authenticated request with an optional date range
     * @param response JSON analytics or an error
     * @throws ServletException if servlet processing fails
     * @throws IOException if the response cannot be written
     */
    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        setJsonResponse(response);
        String userId = requireSessionUserId(request, response);
        if (userId == null) return;
        String path = request.getPathInfo();
        String range = request.getParameter("range");
        if ("/summary".equals(path)) {
            sendJson(response, HttpServletResponse.SC_OK, reportService.summary(userId, range));
        } else if ("/consistency".equals(path)) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("points", reportService.consistency(userId, range)));
        } else if ("/streaks".equals(path)) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("streaks", reportService.streaks(userId, java.time.LocalDate.now())));
        } else if ("/leaderboard".equals(path)) {
            sendJson(response, HttpServletResponse.SC_OK,
                    Map.of("leaderboard", reportService.streaks(userId, java.time.LocalDate.now())));
        } else {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Insights route not found");
        }
    }
}

