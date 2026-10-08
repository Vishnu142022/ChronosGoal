package com.disciplineos.servlet;

import com.disciplineos.dao.GoalDAO;
import com.disciplineos.dao.GoalStepDAO;
import com.disciplineos.service.GoalProgress;

import jakarta.servlet.ServletException;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Creates goal milestones and toggles their completion state.
 * GoalStepDAO applies database changes only after this servlet verifies session ownership.
 */
@WebServlet("/api/goal-steps/*")
public class GoalStepServlet extends ApiServlet {

    /** Repository for goal milestone persistence. */
    private final GoalStepDAO goalStepDAO;
    /** Repository used to verify session ownership of parent goals. */
    private final GoalDAO goalDAO;

    /** Constructs the production servlet with JDBC-backed DAOs. */
    public GoalStepServlet() {
        this(new GoalStepDAO(), new GoalDAO());
    }

    GoalStepServlet(GoalStepDAO goalStepDAO, GoalDAO goalDAO) {
        this.goalStepDAO = goalStepDAO;
        this.goalDAO = goalDAO;
    }

    /**
     * Handles milestone creation and {@code POST /api/goals/{goalId}/steps/{stepId}/toggle}.
     *
     * @param request step route, fields, and active session
     * @param response JSON goal or operation result
     * @throws ServletException when servlet processing fails
     * @throws IOException when reading or writing the request fails
     */
    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }
        String path = request.getPathInfo();

        /*
         * ============================================================
         * TOGGLE STEP
         * POST /api/goals/{goalId}/steps/{stepId}/toggle
         * ============================================================
         */
        if (path != null) {

            String[] parts = path.split("/");

            if (parts.length == 5
                    && "steps".equals(parts[2])
                    && "toggle".equals(parts[4])) {

                String goalId = parts[1];
                String stepId = parts[3];

                if (isEmpty(goalId) || isEmpty(stepId)) {
                    sendError(
                            response,
                            400,
                            "Goal id and step id are required"
                    );
                    return;
                }

                /*
                 * Verify that the goal belongs to the logged-in user.
                 */
                GoalDAO.GoalData goal =
                        goalDAO.getGoalById(goalId, userId);

                if (goal == null) {
                    sendError(
                            response,
                            404,
                            "Goal not found"
                    );
                    return;
                }

                /*
                 * Complete the step.
                 */
                boolean completed =
                        goalStepDAO.toggleStep(stepId, userId);

                if (!completed) {
                    sendError(
                            response,
                            404,
                            "Goal step not found"
                    );
                    return;
                }

                /*
                 * Return the updated Goal object.
                 * Frontend goalsService expects Goal here.
                 */
                GoalDAO.GoalData updatedGoal =
                        goalDAO.getGoalById(goalId, userId);

                if (updatedGoal == null) {
                    sendError(
                            response,
                            404,
                            "Goal not found after step update"
                    );
                    return;
                }

                response.setStatus(HttpServletResponse.SC_OK);

                response.getWriter().write(
                        buildGoalJson(updatedGoal)
                );

                return;
            }
        }

        /*
         * ============================================================
         * CREATE STEP
         * POST /api/goals/steps
         * ============================================================
         */
        if ("/steps".equals(path)) {

            String goalId = request.getParameter("goalId");
            String title = request.getParameter("title");
            String deadline = request.getParameter("deadline");
            String stepOrderParam =
                    request.getParameter("stepOrder");

            if (isEmpty(goalId) || isEmpty(title)) {

                sendError(
                        response,
                        400,
                        "goalId and title are required"
                );
                return;
            }

            /*
             * Make sure the goal belongs to logged-in user.
             */
            GoalDAO.GoalData goal =
                    goalDAO.getGoalById(goalId, userId);

            if (goal == null) {
                sendError(
                        response,
                        404,
                        "Goal not found"
                );
                return;
            }

            int stepOrder = 0;

            if (!isEmpty(stepOrderParam)) {

                try {

                    stepOrder =
                            Integer.parseInt(stepOrderParam);

                } catch (NumberFormatException e) {

                    sendError(
                            response,
                            400,
                            "stepOrder must be a number"
                    );
                    return;
                }
            }

            boolean created =
                    goalStepDAO.createStep(
                            goalId,
                            title.trim(),
                            deadline,
                            stepOrder
                    );

            if (created) {

                response.setStatus(
                        HttpServletResponse.SC_CREATED
                );

                response.getWriter().write(
                        "{"
                        + "\"success\":true,"
                        + "\"message\":\"Goal step created successfully\""
                        + "}"
                );

            } else {

                sendError(
                        response,
                        500,
                        "Unable to create goal step"
                );
            }

            return;
        }

        sendError(
                response,
                404,
                "Goal step route not found"
        );
    }

    /**
     * Handles {@code DELETE /api/goal-steps/{goalId}/steps/{stepId}} for an owned goal.
     *
     * @param request goal-step route and active session
     * @param response deletion confirmation or error
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doDelete(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {
        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }

        String[] parts = request.getPathInfo() == null
                ? new String[0]
                : request.getPathInfo().split("/");
        if (parts.length != 4 || !"steps".equals(parts[2])
                || isEmpty(parts[1]) || isEmpty(parts[3])) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND,
                    "Goal step route not found");
            return;
        }

        String goalId = parts[1];
        String stepId = parts[3];
        if (goalDAO.getGoalById(goalId, userId) == null) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Goal not found");
            return;
        }
        if (!goalStepDAO.deleteStep(goalId, stepId, userId)) {
            sendError(response, HttpServletResponse.SC_NOT_FOUND, "Goal step not found");
            return;
        }
        sendJson(response, HttpServletResponse.SC_OK,
                Map.of("success", true, "message", "Goal step deleted successfully"));
    }


    /**
     * Handles {@code GET /api/goal-steps/steps?goalId={id}} for an owned goal.
     *
     * @param request parent goal query and active session
     * @param response JSON milestone list
     * @throws ServletException when servlet processing fails
     * @throws IOException when writing the response fails
     */
    @Override
    protected void doGet(
            HttpServletRequest request,
            HttpServletResponse response)
            throws ServletException, IOException {

        String userId = requireSessionUserId(request, response);
        if (userId == null) {
            return;
        }

        String path =
                request.getPathInfo();

        /*
         * GET /api/goals/steps?goalId=...
         */
        if (!"/steps".equals(path)) {

            sendError(
                    response,
                    404,
                    "Goal step route not found"
            );
            return;
        }

        String goalId =
                request.getParameter("goalId");

        if (isEmpty(goalId)) {

            sendError(
                    response,
                    400,
                    "goalId is required"
            );
            return;
        }

        /*
         * Verify ownership.
         */
        GoalDAO.GoalData goal =
                goalDAO.getGoalById(
                        goalId,
                        userId
                );

        if (goal == null) {

            sendError(
                    response,
                    404,
                    "Goal not found"
            );
            return;
        }

        List<GoalStepDAO.StepData> steps =
                goalStepDAO.getStepsByGoalId(goalId);

        sendJson(response, HttpServletResponse.SC_OK,
                Map.of("success", true, "steps", stepResponses(steps)));
    }


    private String buildGoalJson(
            GoalDAO.GoalData goal) {
        Map<String, Object> json = new LinkedHashMap<>();
        json.put("id", goal.getId());
        json.put("userId", goal.getUserId());
        json.put("name", goal.getName());
        json.put("category", goal.getCategory());
        json.put("targetHours", goal.getTargetHours());
        json.put("deadline", String.valueOf(goal.getDeadline()));
        json.put("startDate", String.valueOf(goal.getStartDate()));
        json.put("priority", goal.getPriority());
        // Display status mirrors the SQL progress triggers after time-log mutations.
        json.put("status", GoalProgress.statusAfterLog(goal.getStatus(),
                goal.getTotalLoggedMinutes(), BigDecimal.valueOf(goal.getTargetHours())));
        json.put("description", goal.getDescription() == null ? "" : goal.getDescription());
        json.put("totalLoggedMinutes", goal.getTotalLoggedMinutes());
        json.put("progressPercent", GoalProgress.percentComplete(
                goal.getTotalLoggedMinutes(), BigDecimal.valueOf(goal.getTargetHours())));
        json.put("steps", stepResponses(goalStepDAO.getStepsByGoalId(goal.getId())));
        return ServletJson.stringify(json);
    }

    private List<Map<String, Object>> stepResponses(List<GoalStepDAO.StepData> steps) {
        List<Map<String, Object>> responses = new ArrayList<>();
        for (GoalStepDAO.StepData step : steps) {
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("id", step.getId());
            response.put("goalId", step.getGoalId());
            response.put("title", step.getTitle());
            response.put("deadline",
                    step.getDeadline() == null ? null : step.getDeadline().toString());
            response.put("completed", step.isCompleted());
            response.put("completedAt",
                    step.getCompletedAt() == null ? null : step.getCompletedAt().toString());
            response.put("stepOrder", step.getStepOrder());
            responses.add(response);
        }
        return responses;
    }


    private boolean isEmpty(String value) {

        return value == null
                || value.isBlank();
    }

}
