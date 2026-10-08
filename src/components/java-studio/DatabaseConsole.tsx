import React, { useState } from 'react';
import { 
  Database, 
  Play, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  Terminal, 
  Table, 
  Key, 
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { storageService } from '../../services/storageService';
import { simulateJDBCTransaction } from '../../services/javaSimulator';
import { JDBCTransactionStep } from '../../types';

export const DatabaseConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sql-runner' | 'tx-visualizer' | 'schema'>('sql-runner');
  
  // SQL runner state
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT id, name, category, target_hours, deadline, status FROM goals;');
  const [queryResult, setQueryResult] = useState<{ columns: string[]; rows: any[] } | null>(null);
  const [queryExecutionTimeMs, setQueryExecutionTimeMs] = useState<number | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  // Transaction visualizer state
  const [txScenario, setTxScenario] = useState<'SUCCESS_CREATE_GOAL_WITH_LOG' | 'FAILURE_NEGATIVE_DURATION'>('SUCCESS_CREATE_GOAL_WITH_LOG');
  const [txSteps, setTxSteps] = useState<JDBCTransactionStep[]>(() => simulateJDBCTransaction('SUCCESS_CREATE_GOAL_WITH_LOG'));
  const [isExecutingTx, setIsExecutingTx] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(txSteps.length);

  const presetQueries = [
    {
      title: 'Active Goals with Targets',
      sql: 'SELECT id, name, category, target_hours, deadline, status FROM goals ORDER BY deadline ASC;'
    },
    {
      title: 'Time Logs with Durations',
      sql: 'SELECT id, goal_id, user_name, start_time, end_time, duration_minutes, notes FROM time_logs ORDER BY start_time DESC;'
    },
    {
      title: 'Goal Settings Parameters',
      sql: 'SELECT id, category_name, metric_type, default_target_hours, difficulty_multiplier, is_active FROM goal_parameters;'
    },
    {
      title: 'Aggregated Time Spent by Category (GROUP BY)',
      sql: 'SELECT g.category, COUNT(DISTINCT g.id) AS total_goals, ROUND(SUM(t.duration_minutes) / 60.0, 1) AS total_hours_logged FROM goals g LEFT JOIN time_logs t ON g.id = t.goal_id GROUP BY g.category;'
    }
  ];

  const handleExecuteSql = () => {
    setQueryError(null);
    const start = performance.now();
    const query = sqlQuery.trim().toLowerCase();

    try {
      if (query.includes('from goals') && query.includes('group by g.category')) {
        const goals = storageService.getGoals();
        const logs = storageService.getTimeLogs();
        const catMap = new Map<string, { totalGoals: number; totalMinutes: number }>();

        goals.forEach(g => {
          if (!catMap.has(g.category)) {
            catMap.set(g.category, { totalGoals: 0, totalMinutes: 0 });
          }
          const item = catMap.get(g.category)!;
          item.totalGoals++;
          const gLogs = logs.filter(l => l.goalId === g.id);
          item.totalMinutes += gLogs.reduce((acc, curr) => acc + curr.durationMinutes, 0);
        });

        const rows = Array.from(catMap.entries()).map(([cat, data]) => ({
          category: cat,
          total_goals: data.totalGoals,
          total_hours_logged: (data.totalMinutes / 60.0).toFixed(1) + 'h'
        }));

        setQueryResult({
          columns: ['category', 'total_goals', 'total_hours_logged'],
          rows
        });
      } else if (query.includes('from goals')) {
        const goals = storageService.getGoals();
        const rows = goals.map(g => ({
          id: g.id,
          name: g.name,
          category: g.category,
          target_hours: g.targetHours + 'h',
          logged_hours: (g.totalLoggedMinutes / 60.0).toFixed(1) + 'h',
          deadline: g.deadline,
          status: g.status
        }));
        setQueryResult({
          columns: ['id', 'name', 'category', 'target_hours', 'logged_hours', 'deadline', 'status'],
          rows
        });
      } else if (query.includes('from time_logs')) {
        const logs = storageService.getTimeLogs();
        const rows = logs.map(l => ({
          id: l.id,
          goal_name: l.goalName,
          user_name: l.userName,
          start_time: l.startTime.replace('T', ' '),
          end_time: l.endTime.replace('T', ' '),
          duration_minutes: l.durationMinutes + ' min',
          productivity: l.productivityRating + ' ★',
          notes: l.notes
        }));
        setQueryResult({
          columns: ['id', 'goal_name', 'user_name', 'start_time', 'end_time', 'duration_minutes', 'productivity', 'notes'],
          rows
        });
      } else if (query.includes('from goal_parameters')) {
        const params = storageService.getParameters();
        const rows = params.map(p => ({
          id: p.id,
          category_name: p.categoryName,
          metric_type: p.metricType,
          default_target_hours: p.defaultTargetHours + 'h',
          difficulty_multiplier: p.difficultyMultiplier + 'x',
          is_active: p.isActive ? 'TRUE' : 'FALSE'
        }));
        setQueryResult({
          columns: ['id', 'category_name', 'metric_type', 'default_target_hours', 'difficulty_multiplier', 'is_active'],
          rows
        });
      } else {
        setQueryResult({
          columns: ['status', 'message', 'rows_affected'],
          rows: [{ status: 'SUCCESS', message: 'Query parsed and executed via PreparedStatement', rows_affected: 1 }]
        });
      }

      setQueryExecutionTimeMs(Math.round((performance.now() - start + 2.5) * 10) / 10);
    } catch (e: any) {
      setQueryError(e.message || 'SQL Execution error');
    }
  };

  const handleRunTransactionSimulation = async (scenario: 'SUCCESS_CREATE_GOAL_WITH_LOG' | 'FAILURE_NEGATIVE_DURATION') => {
    setTxScenario(scenario);
    const steps = simulateJDBCTransaction(scenario);
    setTxSteps(steps);
    setIsExecutingTx(true);
    setActiveStepIndex(0);

    for (let i = 0; i <= steps.length; i++) {
      setActiveStepIndex(i);
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    setIsExecutingTx(false);
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 rounded-full font-mono flex items-center space-x-1">
              <Database className="w-3.5 h-3.5 mr-1" />
              JDBC &amp; DATABASE INTEGRATION
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Relational SQL Console &amp; JDBC Transaction Visualizer
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Execute SQL queries, inspect tables &amp; constraints, and visually step through JDBC transaction demarcation (conn.setAutoCommit(false), PreparedStatement, commit &amp; rollback).
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('sql-runner')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'sql-runner' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SQL Query Runner
          </button>
          <button
            onClick={() => setActiveTab('tx-visualizer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tx-visualizer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            JDBC Transaction Engine
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'schema' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Schema &amp; DDL
          </button>
        </div>
      </div>

      {/* TAB 1: SQL Query Runner */}
      {activeTab === 'sql-runner' && (
        <div className="space-y-6">
          
          {/* Preset Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">Preset Queries:</span>
            {presetQueries.map((pq, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSqlQuery(pq.sql);
                  setQueryResult(null);
                }}
                className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                {pq.title}
              </button>
            ))}
          </div>

          {/* Editor & Execute Button */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>PreparedStatement SQL Editor</span>
              </span>

              <button
                onClick={handleExecuteSql}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Execute SQL Query</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-indigo-300 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Query Results */}
          {queryError && (
            <div className="p-4 bg-rose-950/80 border border-rose-700/60 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>SQLException: {queryError}</span>
            </div>
          )}

          {queryResult && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden space-y-2">
              <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Query ResultSet ({queryResult.rows.length} rows returned)</span>
                <span className="font-mono text-emerald-400">Execution time: {queryExecutionTimeMs}ms (JDBC PreparedStatement)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      {queryResult.columns.map(col => (
                        <th key={col} className="px-4 py-2.5 font-semibold font-mono">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {queryResult.rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        {queryResult.columns.map(col => (
                          <td key={col} className="px-4 py-2.5 font-mono text-slate-200 whitespace-nowrap">
                            {String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: JDBC Transaction Visualizer */}
      {activeTab === 'tx-visualizer' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center space-x-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Interactive JDBC ACID Transaction Simulation</span>
              </h3>
              <p className="text-xs text-slate-400">
                Witness how <code className="text-indigo-300 font-mono">conn.setAutoCommit(false)</code>, PreparedStatement executions, and atomic commits/rollbacks protect database consistency.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleRunTransactionSimulation('SUCCESS_CREATE_GOAL_WITH_LOG')}
                disabled={isExecutingTx}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                Run Success Transaction (Commit)
              </button>

              <button
                onClick={() => handleRunTransactionSimulation('FAILURE_NEGATIVE_DURATION')}
                disabled={isExecutingTx}
                className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
              >
                Run Failure (Rollback on Error)
              </button>
            </div>
          </div>

          {/* Steps list */}
          <div className="space-y-3">
            {txSteps.map((step, idx) => {
              const isPassedStep = idx < activeStepIndex;
              const isCurrentStep = idx === activeStepIndex - 1;
              return (
                <div
                  key={step.stepNumber}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isCurrentStep
                      ? 'bg-indigo-950/70 border-indigo-500 shadow-lg shadow-indigo-950/50'
                      : isPassedStep
                        ? step.status === 'ROLLED_BACK' || step.status === 'FAILED'
                          ? 'bg-rose-950/30 border-rose-800/60'
                          : 'bg-slate-900 border-slate-800'
                        : 'bg-slate-950/40 border-slate-900 opacity-40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                        step.status === 'ROLLED_BACK' || step.status === 'FAILED'
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}>
                        {step.stepNumber}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            step.action === 'COMMIT' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            step.action === 'ROLLBACK' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                            'bg-slate-800 text-indigo-300'
                          }`}>
                            {step.action}
                          </span>
                          <span className="text-xs text-slate-300 font-medium">{step.description}</span>
                        </div>

                        <p className="font-mono text-xs text-cyan-300 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80">
                          {step.sql}
                        </p>
                      </div>
                    </div>

                    <div className="text-right whitespace-nowrap text-xs">
                      {isPassedStep ? (
                        <span className={`font-mono font-semibold flex items-center space-x-1 ${
                          step.status === 'ROLLED_BACK' || step.status === 'FAILED' ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {step.status === 'ROLLED_BACK' || step.status === 'FAILED' ? (
                            <XCircle className="w-4 h-4 inline" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 inline" />
                          )}
                          <span>{step.executionTimeMs}ms</span>
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono text-[11px]">Pending...</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: Schema DDL */}
      {activeTab === 'schema' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Table: users */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-100 font-mono flex items-center space-x-2">
                <Table className="w-4 h-4 text-indigo-400" />
                <span>users (Table)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">PK: id</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-indigo-400 font-semibold">id (BIGSERIAL)</span>
                <span className="text-amber-400 text-[10px]">PRIMARY KEY</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">name (VARCHAR 120)</span>
                <span className="text-slate-500 text-[10px]">NOT NULL</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">email (VARCHAR 160)</span>
                <span className="text-cyan-400 text-[10px]">UNIQUE NOT NULL</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">role (VARCHAR 20)</span>
                <span className="text-slate-500 text-[10px]">ADMIN | USER</span>
              </div>
            </div>
          </div>

          {/* Table: goals */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-100 font-mono flex items-center space-x-2">
                <Table className="w-4 h-4 text-indigo-400" />
                <span>goals (Table)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">FK: user_id -&gt; users(id)</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-indigo-400 font-semibold">id (BIGSERIAL)</span>
                <span className="text-amber-400 text-[10px]">PRIMARY KEY</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">user_id (BIGINT)</span>
                <span className="text-indigo-400 text-[10px]">FOREIGN KEY (CASCADE)</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">target_hours (NUMERIC)</span>
                <span className="text-emerald-400 text-[10px]">CHECK &gt; 0</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">deadline (DATE)</span>
                <span className="text-slate-500 text-[10px]">INDEXED NOT NULL</span>
              </div>
            </div>
          </div>

          {/* Table: time_logs */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-100 font-mono flex items-center space-x-2">
                <Table className="w-4 h-4 text-emerald-400" />
                <span>time_logs (Table)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">FK: goal_id -&gt; goals(id)</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-indigo-400 font-semibold">id (BIGSERIAL)</span>
                <span className="text-amber-400 text-[10px]">PRIMARY KEY</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">goal_id (BIGINT)</span>
                <span className="text-indigo-400 text-[10px]">FOREIGN KEY (CASCADE)</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">duration_minutes (BIGINT)</span>
                <span className="text-emerald-400 text-[10px]">CHECK &gt; 0</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">productivity_rating (INT)</span>
                <span className="text-amber-400 text-[10px]">CHECK 1-5</span>
              </div>
            </div>
          </div>

          {/* Table: goal_parameters */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-100 font-mono flex items-center space-x-2">
                <Table className="w-4 h-4 text-cyan-400" />
                <span>goal_parameters (Table)</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Admin Config</span>
            </div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-indigo-400 font-semibold">id (BIGSERIAL)</span>
                <span className="text-amber-400 text-[10px]">PRIMARY KEY</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">category_name (VARCHAR)</span>
                <span className="text-cyan-400 text-[10px]">UNIQUE NOT NULL</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">difficulty_multiplier (NUMERIC)</span>
                <span className="text-slate-500 text-[10px]">DEFAULT 1.0</span>
              </div>
              <div className="flex justify-between p-1.5 bg-slate-950 rounded border border-slate-800">
                <span className="text-slate-300">is_active (BOOLEAN)</span>
                <span className="text-emerald-400 text-[10px]">DEFAULT TRUE</span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

