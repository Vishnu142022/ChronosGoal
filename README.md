# ChronosGoal

ChronosGoal is a goal-setting and time-management web application. It keeps the existing React interface and connects its authentication, goal, time-tracking, and administrator workflows to a Java 17 Servlet backend using JDBC and MySQL.

## Problem statement

People need a consistent way to turn personal objectives into measurable targets, record effort over time, and understand whether they are making progress. ChronosGoal provides personal goal, task, habit, and time-tracking workflows, while administrators configure goal parameters, manage accounts, and review usage.

## Features

- User registration and session-based login with BCrypt password hashes.
- Create, update, and delete personal goals with targets, categories, priorities, and deadlines.
- Record, edit, and delete goal-linked time sessions.
- Calculate goal progress from database time logs; database triggers maintain totals and completion status.
- Persist personal tasks and habits, including per-day habit history, in MySQL.
- View session-scoped consistency, streak, and tracked-time insights.
- Administrator goal-parameter management, user status/password management, usage reports, and an audit trail.
- Role checks on administrator endpoints and prepared SQL statements for database operations.

## Technology stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Java 17, Jakarta Servlet 6, Apache Tomcat 10.1
- **Persistence:** JDBC and MySQL 8
- **Security and serialization:** BCrypt password hashing, server-side HTTP sessions, Jackson JSON handling
- **Testing:** JUnit 5 and Mockito

## Project structure

```text
backend/
  src/main/java/com/disciplineos/
    config/       JDBC connection configuration
    dao/          Prepared-statement database access
    filter/       Session and API error filters
    service/      Validation, progress, insights, and concurrent admin reports
    servlet/      Authentication, goal, task, habit, time-log, insight, and admin endpoints
  src/main/resources/db/schema.sql
src/
  components/     Existing React interface
  services/       Frontend API clients and local demo storage
server.ts         Frontend development server and Java API proxy
```

## Requirements

- JDK 17
- Maven 3.9+
- MySQL 8.0+
- Apache Tomcat 10.1+ (Jakarta Servlet 6)
- Node.js 20.19+ and npm

## Database setup

1. Start MySQL and create the schema, tables, indexes, foreign keys, and progress triggers:

   ```sql
   SOURCE C:/path/to/chronosgoal---time-management-and-goal-setting-system/backend/src/main/resources/db/schema.sql;
   ```

   Run that command from the MySQL client. The script creates the `discipline_os_db` database if needed.

2. Provide the database and administrator bootstrap variables in the environment used to start Tomcat. The project-local `start-backend.ps1` launcher prompts for these values securely and starts Tomcat with them. For a manual setup, use a trusted secret manager or launcher to provide `DB_URL`, `DB_USER`, `DB_PASSWORD`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` to the Tomcat process; do not place secret values in command history or source control.

   The Java backend requires `DB_USER` and `DB_PASSWORD` (and reads `DB_URL`, defaulting only to the local database URL), or matching Java system properties. Create a least-privileged MySQL account instead of using `root`. The initial administrator is created on its first successful admin sign-in when the configured credentials are supplied. Keep secrets out of source control. There is no default demo login.

## Default setup

The application does not ship with an administrator account or hard-coded credentials. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment used to run Tomcat; the first matching admin sign-in bootstraps the account. Set `DB_URL`, `DB_USER`, and `DB_PASSWORD` for the MySQL connection as shown above. Do not commit `.env` files or real credentials; `.env.example` contains configuration names only.

## Run the backend

The machine-specific PowerShell launcher prompts for the database and admin credentials without echoing the passwords, builds and verifies the WAR, deploys it to the configured Tomcat, and starts Tomcat in the foreground. Stop any existing service using port 8080 before running it:

```powershell
.\start-backend.ps1
```

The launcher is ignored by Git because it contains local JDK and Tomcat paths. Update those paths in the local script if your installation differs. It uses `DB_URL` for `discipline_os_db` and `DB_USER=discipline_app`; set the required database privileges before use. The first admin sign-in creates an administrator only when both submitted credentials match the configured `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The default frontend proxy expects Tomcat at `http://127.0.0.1:8080` and the deployed context `/discipline-os-backend`.

The backend requires MySQL with the supplied schema and the environment variables described above.

## Run the frontend

Install frontend dependencies and run the existing interface:

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000`. Requests to `/api` are proxied to the Java web application. To change the frontend API base, set `VITE_API_BASE_URL` before starting the frontend.

For a frontend production build, run `npm run build`. Configure the production server and Tomcat proxy to use the same `/api` contract.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/register` | Create an account and start its session |
| `POST` | `/api/login` | Authenticate a user |
| `POST` | `/api/admin-login` | Authenticate an administrator |
| `GET` | `/api/auth/me` | Restore the active session |
| `GET`, `POST` | `/api/goals` | List and create the session owner's goals |
| `PUT`, `DELETE` | `/api/goals/{id}` | Update or delete an owned goal |
| `GET` | `/api/goal-steps/steps?goalId={id}` | List steps for an owned goal |
| `POST` | `/api/goal-steps/steps` | Create a step using form parameters `goalId`, `title`, optional `deadline`, and `stepOrder` |
| `POST`, `DELETE` | `/api/goal-steps/{goalId}/steps/{stepId}...` | Toggle completion or delete a step under an owned goal |
| `GET`, `POST` | `/api/time-logs` | List or record the session owner's time |
| `PUT`, `DELETE` | `/api/time-logs?id={id}` | Update or delete an owned time log |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/tasks...` | Session-owned task CRUD and completion toggle |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/habits...` | Session-owned habit CRUD, date toggles, and freeze marker |
| `GET` | `/api/insights/{summary,consistency,streaks,leaderboard}` | Habit consistency and streak analytics, plus tracked-time summary |
| `GET` | `/api/admin/dashboard` | Concurrent admin summary, users, parameters, usage, and audit report |
| `GET`, `POST`, `PUT`, `DELETE` | `/api/admin/...` | Admin-only account and goal-parameter operations |

All protected endpoints use the server-side HTTP session. User goal and time-log queries derive ownership from that session rather than trusting a user ID supplied by the browser.
Time-log updates send JSON; the servlet reads and validates the JSON body for `PUT`.

## Design and rubric mapping

- **Problem understanding and design:** separate user and administrator workflows; goals own time logs and optional steps through foreign keys.
- **Core Java:** DAOs and servlets encapsulate responsibilities; collections represent report and query results; request validation and explicit error responses handle invalid input; the admin dashboard report service uses a bounded executor and shuts it down with the servlet.
- **JDBC:** parameterized SQL, relational constraints, transaction-protected administrator changes and audit entries, and triggers that recalculate logged minutes and goal status.
- **Servlet/web integration:** HTTP method handlers, JSON request/response serialization, role checks, and session-backed authentication.
- **Code quality and testing:** JUnit 5 tests cover progress calculations, validation, password hashing, report concurrency, and servlet/filter behavior; Maven compiles and tests the Java 17 WAR; TypeScript checks and Vite builds validate the existing frontend and API wiring.

## Design diagrams

- [System architecture](docs/architecture.md)
- [Database ER diagram](docs/database-erd.md)
- [User and administrator flows](docs/workflows.md)

The project does not include hard-coded demo credentials or screenshots of a running database-backed instance. Capture screenshots after deploying with your own configured account and database.

## Screenshots

Screenshots are intentionally not bundled because they may expose personal account data. Add sanitized application screenshots here after running the project against your own database.

<!-- Replace these placeholders with real, sanitized captures before submission. -->
- User dashboard: _capture after a successful configured login._
- Goals and progress: _capture a goal with tracked progress._
- Admin dashboard: _capture using a configured administrator account._

## How to run the tests

From the project root, run the backend unit tests (they do not require a live MySQL server):

```powershell
mvn -f backend\pom.xml test
```

The suite currently contains **100 JUnit 5 tests**. Additional checks are available with `npm run lint` and `npm run build`.

## Validation commands

Run from the project root:

```powershell
mvn -f backend\pom.xml test
mvn -f backend\pom.xml clean package
mvn -f backend\pom.xml javadoc:javadoc
npm run lint
npm run build
```

The unit tests run without MySQL. The Java endpoints require a running MySQL database with the supplied schema for end-to-end validation. Password recovery is visibly marked unavailable until an email delivery service is configured.

## GitHub submission

Initialize a Git repository if needed, create a public repository or grant reviewer access, and push the project without `.env`, credentials, local databases, or generated directories. Replace the placeholder URL below with the repository URL you created, then provide that URL in the submission form:

```powershell
git remote add origin <your-repository-url>
git push -u origin main
```

Do not include real passwords, API keys, or personal data in the repository or screenshots.

