import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Play, 
  RotateCcw, 
  Award, 
  Layers, 
  Cpu, 
  ShieldCheck, 
  Clock, 
  Code2, 
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { runJUnitTestSuite, JUNIT_TESTS } from '../../services/javaSimulator';
import { UnitTestResult } from '../../types';
import confetti from 'canvas-confetti';

export const JUnitTestSuite: React.FC = () => {
  const [testResults, setTestResults] = useState<UnitTestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentRunningTest, setCurrentRunningTest] = useState<string | null>(null);
  const [progressCount, setProgressCount] = useState<number>(0);

  const handleRunAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setProgressCount(0);

    const results = await runJUnitTestSuite((completed, total, current) => {
      setProgressCount(completed);
      setCurrentRunningTest(current);
    });

    setTestResults(results);
    setIsRunning(false);
    setCurrentRunningTest(null);

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const passedTestsCount = testResults.filter(t => t.passed).length;
  const totalDurationMs = testResults.reduce((acc, curr) => acc + curr.durationMs, 0);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 rounded-full font-mono flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              JAVA TEST SIMULATOR
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white font-['Space_Grotesk']">
            Java Concept Demo
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            This browser simulation is an educational demo, not the backend test runner. Run the actual Java JUnit tests with <code>mvn -f backend\pom.xml test</code>.
          </p>
        </div>

        <button
          onClick={handleRunAllTests}
          disabled={isRunning}
          className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all self-start md:self-auto"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{isRunning ? 'Running browser demo...' : 'Run Demo Cases'}</span>
        </button>
      </div>

      {/* Test Progress & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">Test Suite Status</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {testResults.length > 0 ? `${passedTestsCount} / ${testResults.length}` : 'Demo only'}
            </span>
            {testResults.length > 0 && <span className="text-xs text-emerald-400 font-semibold">Demo results</span>}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Browser-based simulation</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">Execution Duration</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold font-mono text-indigo-400">{totalDurationMs} ms</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Demo timing only; not JVM execution</p>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">Rubric Coverage</span>
          <div className="flex items-baseline space-x-2 mt-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">6 / 6 Sections</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">OOP, JDBC, Servlets, Threads, Exceptions</p>
        </div>

      </div>

      {/* Progress Bar during execution */}
      {isRunning && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-300 font-medium">Executing: <strong className="font-mono text-indigo-400">{currentRunningTest}</strong></span>
            <span className="font-mono text-slate-400">{progressCount} / {JUNIT_TESTS.length}</span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(progressCount / JUNIT_TESTS.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tests Breakdown Table / Cards */}
      <div className="space-y-3">
        {(testResults.length > 0 ? testResults : JUNIT_TESTS).map((test, index) => {
          const result = testResults[index];
          return (
            <div
              key={test.id}
              className={`p-4 bg-slate-900 border rounded-2xl transition-all ${
                result ? 'border-emerald-800/40 hover:border-emerald-700/60' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-200">{test.className}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs font-mono text-indigo-400 font-semibold">{test.methodName}</span>
                    <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-slate-800 text-cyan-300">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{test.description}</p>
                </div>

                <div className="flex items-center space-x-3 self-start sm:self-auto">
                  {result ? (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-slate-400">{result.durationMs}ms</span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>PASSED</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Not yet run</span>
                  )}
                </div>
              </div>

              {result && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 font-mono text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="text-emerald-400/90">{result.assertionDetail}</span>
                  <span className="text-slate-500">{result.outputMessage}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

