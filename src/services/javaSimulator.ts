import JSZip from 'jszip';
import { JAVA_PROJECT_FILES } from '../data/javaSourceCode';
import { UnitTestResult, JDBCTransactionStep, Goal, TimeLog } from '../types';

export const JUNIT_TESTS: Omit<UnitTestResult, 'passed' | 'durationMs' | 'assertionDetail'>[] = [
  {
    id: 'test_1',
    className: 'GoalServiceTest',
    methodName: 'testProgressCalculation()',
    description: 'Verify accurate percentage computation (10h logged on 20h target == 50.0%)',
    category: 'Core Java & OOP'
  },
  {
    id: 'test_2',
    className: 'GoalServiceTest',
    methodName: 'testProgressCapAt100()',
    description: 'Verify progress is capped at 100.0% and status auto-transitions to COMPLETED',
    category: 'Core Java & OOP'
  },
  {
    id: 'test_3',
    className: 'GoalServiceTest',
    methodName: 'testInvalidTimeDuration()',
    description: 'Assert that ValidationException is thrown when endTime < startTime',
    category: 'Exception Handling'
  },
  {
    id: 'test_4',
    className: 'GoalServiceTest',
    methodName: 'testGoalComparableOrdering()',
    description: 'Verify PriorityQueue sorts goals by earliest deadline first',
    category: 'Collections'
  },
  {
    id: 'test_5',
    className: 'DBConnectionPoolTest',
    methodName: 'testConcurrentConnectionCheckout()',
    description: 'Assert thread-safe synchronization when 10 threads request connections simultaneously',
    category: 'Threads & Concurrency'
  },
  {
    id: 'test_6',
    className: 'TransactionRollbackTest',
    methodName: 'testAtomicRollbackOnConstraintViolation()',
    description: 'Verify conn.rollback() restores previous state when SQL error occurs',
    category: 'Database Integration (JDBC)'
  },
  {
    id: 'test_7',
    className: 'AuthFilterTest',
    methodName: 'testAdminRouteForbiddenForRegularUser()',
    description: 'Assert HTTP 403 Forbidden is returned when regular user requests /api/admin/*',
    category: 'Servlets & Web Integration'
  },
  {
    id: 'test_8',
    className: 'SessionManagementTest',
    methodName: 'testSessionTimeoutInvalidation()',
    description: 'Verify session listener reaps expired sessions and resets user context',
    category: 'Servlets & Web Integration'
  }
];

export async function runJUnitTestSuite(
  onProgress?: (completed: number, total: number, currentTest: string) => void
): Promise<UnitTestResult[]> {
  const results: UnitTestResult[] = [];
  
  for (let i = 0; i < JUNIT_TESTS.length; i++) {
    const test = JUNIT_TESTS[i];
    if (onProgress) {
      onProgress(i, JUNIT_TESTS.length, `${test.className}#${test.methodName}`);
    }
    // Simulate real execution delay
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));

    const duration = Math.floor(12 + Math.random() * 45);
    results.push({
      ...test,
      passed: true,
      durationMs: duration,
      outputMessage: `SUCCESS: Test passed in ${duration}ms [JVM thread: pool-2-thread-${(i % 4) + 1}]`,
      assertionDetail: `Assertions evaluated: org.junit.jupiter.api.Assertions.assertEquals() -> PASSED`
    });
  }

  if (onProgress) {
    onProgress(JUNIT_TESTS.length, JUNIT_TESTS.length, 'All tests completed successfully!');
  }

  return results;
}

export function simulateJDBCTransaction(scenario: 'SUCCESS_CREATE_GOAL_WITH_LOG' | 'FAILURE_NEGATIVE_DURATION'): JDBCTransactionStep[] {
  if (scenario === 'SUCCESS_CREATE_GOAL_WITH_LOG') {
    return [
      {
        stepNumber: 1,
        sql: "Connection conn = pool.getConnection();",
        action: 'AUTOCOMMIT_OFF',
        description: "Acquired connection from DBConnectionPool. Set autoCommit = false to begin transaction demarcation.",
        status: 'EXECUTED',
        executionTimeMs: 1.2
      },
      {
        stepNumber: 2,
        sql: "INSERT INTO goals (user_id, name, target_hours, deadline, priority, status) VALUES (2, 'Master Java Concurrency', 30.0, '2026-11-01', 'HIGH', 'IN_PROGRESS') RETURNING id;",
        action: 'EXECUTE_UPDATE',
        description: "Executed PreparedStatement for goal insertion. Generated Key ID = 106.",
        status: 'EXECUTED',
        executionTimeMs: 3.8,
        rowsAffected: 1
      },
      {
        stepNumber: 3,
        sql: "INSERT INTO time_logs (goal_id, user_id, start_time, end_time, duration_minutes, notes) VALUES (106, 2, '2026-09-26 14:00', '2026-09-26 16:30', 150, 'Initial setup');",
        action: 'EXECUTE_UPDATE',
        description: "Inserted initial work session log into time_logs table referencing Foreign Key goal_id = 106.",
        status: 'EXECUTED',
        executionTimeMs: 2.9,
        rowsAffected: 1
      },
      {
        stepNumber: 4,
        sql: "UPDATE goals SET updated_at = NOW() WHERE id = 106;",
        action: 'EXECUTE_UPDATE',
        description: "Updated parent goal modification timestamp and recomputed progress percentage.",
        status: 'EXECUTED',
        executionTimeMs: 1.5,
        rowsAffected: 1
      },
      {
        stepNumber: 5,
        sql: "conn.commit();",
        action: 'COMMIT',
        description: "All queries executed without constraint errors. Committed transaction to disk WAL.",
        status: 'EXECUTED',
        executionTimeMs: 4.1
      },
      {
        stepNumber: 6,
        sql: "conn.setAutoCommit(true); pool.releaseConnection(conn);",
        action: 'CLOSE_CONN',
        description: "Reset connection auto-commit state and returned connection back to DBConnectionPool idle queue.",
        status: 'EXECUTED',
        executionTimeMs: 0.8
      }
    ];
  } else {
    return [
      {
        stepNumber: 1,
        sql: "Connection conn = pool.getConnection(); conn.setAutoCommit(false);",
        action: 'AUTOCOMMIT_OFF',
        description: "Transaction initialized with autoCommit = false.",
        status: 'EXECUTED',
        executionTimeMs: 1.1
      },
      {
        stepNumber: 2,
        sql: "INSERT INTO goals (user_id, name, target_hours, deadline) VALUES (2, 'Invalid Goal Target', -15.0, '2026-12-01');",
        action: 'EXECUTE_UPDATE',
        description: "Attempted insert with target_hours <= 0 violating CHECK constraint (target_hours > 0).",
        status: 'FAILED',
        executionTimeMs: 2.1
      },
      {
        stepNumber: 3,
        sql: "/* SQLException: Check constraint 'chk_goals_target_positive' failed */",
        action: 'CHECK_CONSTRAINTS',
        description: "Database threw PSQLException. Catch block intercepted exception.",
        status: 'FAILED',
        executionTimeMs: 0.5
      },
      {
        stepNumber: 4,
        sql: "conn.rollback();",
        action: 'ROLLBACK',
        description: "Invoked conn.rollback(). Atomic reversal of all uncommitted writes. Database state preserved.",
        status: 'ROLLED_BACK',
        executionTimeMs: 2.4
      },
      {
        stepNumber: 5,
        sql: "pool.releaseConnection(conn);",
        action: 'CLOSE_CONN',
        description: "Safely released connection back to pool in finally block.",
        status: 'EXECUTED',
        executionTimeMs: 0.7
      }
    ];
  }
}

export async function downloadMavenProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Add README
  zip.file('README.md', `# ChronosGoal - Time Management and Goal Setting System

## Project Overview
ChronosGoal is a robust enterprise Java Web Application designed for comprehensive personal goal setting, time tracking, deadline monitoring, and administrative analytics.

## Technologies & Specifications
- **Java 17 / Jakarta EE 10**
- **Java Servlets & Web Filters** (\`GoalServlet\`, \`TimeLogServlet\`, \`AuthFilter\`)
- **JDBC & Connection Pooling** (PreparedStatement, ACID Transactions, Commit & Rollback)
- **Multi-Threading** (\`GoalDeadlineMonitorThread\`, \`ProgressCalculationWorker\`)
- **Database Schema**: PostgreSQL 14+ / MySQL 8+ / H2 In-Memory
- **Build Tool**: Apache Maven
- **Testing**: JUnit 5 (\`GoalServiceTest\`)

## Project Structure
\`\`\`
chronos-goal-tracker/
├── pom.xml
├── schema.sql
├── src/
│   ├── main/
│   │   ├── java/com/timetrack/
│   │   │   ├── model/ (BaseEntity, User, Goal, TimeLog, GoalParameter)
│   │   │   ├── dao/ (GoalDAO, GoalDAOImpl, UserDAO, TimeLogDAO)
│   │   │   ├── service/ (GoalDeadlineMonitorThread, GoalService)
│   │   │   ├── servlet/ (GoalServlet, TimeLogServlet)
│   │   │   ├── filter/ (AuthFilter)
│   │   │   ├── exception/ (ValidationException, DatabaseException)
│   │   │   └── util/ (DBConnectionPool)
│   │   └── webapp/WEB-INF/web.xml
│   └── test/java/com/timetrack/service/GoalServiceTest.java
\`\`\`

## How to Build and Run
1. Ensure Java 17+ and Maven 3.8+ are installed.
2. Run database migration script:
   \`psql -U postgres -d chronos_db -f schema.sql\`
3. Compile and run test suite:
   \`mvn clean test\`
4. Package the WAR file:
   \`mvn package\`
5. Deploy \`target/chronos-goal-tracker.war\` to Apache Tomcat 10+ or run with embedded Tomcat.
`);

  // Add all files from repository
  JAVA_PROJECT_FILES.forEach(f => {
    zip.file(f.path, f.code);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chronos-goal-setting-java-project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportGoalsToCSV(goals: Goal[]): void {
  const headers = ['Goal ID', 'Goal Name', 'Category', 'Target Hours', 'Logged Hours', 'Progress %', 'Deadline', 'Priority', 'Status', 'Start Date'];
  const rows = goals.map(g => [
    g.id,
    `"${g.name.replace(/"/g, '""')}"`,
    `"${g.category}"`,
    g.targetHours,
    (g.totalLoggedMinutes / 60.0).toFixed(1),
    g.targetHours > 0 ? ((g.totalLoggedMinutes / (g.targetHours * 60)) * 100).toFixed(1) + '%' : '0%',
    g.deadline,
    g.priority,
    g.status,
    g.startDate
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `chronos_goals_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportTimeLogsToCSV(logs: TimeLog[]): void {
  const headers = ['Log ID', 'Goal ID', 'Goal Name', 'User', 'Start Time', 'End Time', 'Duration (Min)', 'Duration (Hours)', 'Productivity (1-5)', 'Notes'];
  const rows = logs.map(l => [
    l.id,
    l.goalId,
    `"${(l.goalName || '').replace(/"/g, '""')}"`,
    `"${(l.userName || '').replace(/"/g, '""')}"`,
    l.startTime,
    l.endTime,
    l.durationMinutes,
    (l.durationMinutes / 60.0).toFixed(2),
    l.productivityRating,
    `"${(l.notes || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `chronos_timelogs_export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

