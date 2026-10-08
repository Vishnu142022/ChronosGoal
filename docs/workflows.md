# User and administrator workflows

```mermaid
flowchart TD
    Start([Open ChronosGoal]) --> Login{Choose role}
    Login -->|User| UserAuth[Register or sign in]
    Login -->|Admin| AdminAuth[Administrator sign in]
    UserAuth --> UserDashboard[User dashboard]
    UserDashboard --> Goal[Create or update goal]
    Goal --> Track[Record start, end, and goal]
    Track --> Progress[View calculated progress and achievement]
    UserDashboard --> Task[Create, update, complete, or delete tasks]
    UserDashboard --> Habit[Create habits and log or freeze dates]
    Habit --> Streaks[Review streak and consistency]
    Track --> Insights[Review time summary and insights]
    Habit --> Insights
    AdminAuth --> AdminDashboard[Admin dashboard]
    AdminDashboard --> Parameters[Configure goal parameters]
    AdminDashboard --> Users[Manage accounts and permissions]
    AdminDashboard --> Reports[Review usage and audit reports]
```

Protected operations use the authenticated session; users can access only their own goals, goal steps, time logs, tasks, and habits. Habit completion history is stored per date, and insights summarize time logs and habit logs without changing their source data.

