import React, { useState, useEffect } from 'react';
import { DeadlockMetrics, DeadlockRecord } from '../types.js';
import { 
  ShieldAlert, 
  CheckCircle, 
  Activity, 
  Clock, 
  Users, 
  RotateCcw, 
  History, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface DeadlockMetricsPanelProps {
  metrics: DeadlockMetrics;
  onFocusRobot?: (robotId: string) => void;
}

export const DeadlockMetricsPanel: React.FC<DeadlockMetricsPanelProps> = ({
  metrics,
  onFocusRobot,
}) => {
  const [history, setHistory] = useState<DeadlockRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/deadlocks?limit=15');
      const data = await res.json();
      if (data.success && data.deadlocks) {
        setHistory(data.deadlocks);
      }
    } catch (e) {
      console.error('Failed to load deadlock history:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 space-y-4 shadow-xs">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Deadlock Recovery Analytics & Audit History
          </h3>
        </div>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 6 Section 38 Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Deadlocks Detected */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Detected</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-700 tabular-nums">
            {metrics.deadlocks_detected}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Total cycle events</div>
        </div>

        {/* 2. Deadlocks Recovered */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Recovered</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-700 tabular-nums">
            {metrics.recovered_deadlocks}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Resolved automatically</div>
        </div>

        {/* 3. Currently Active Deadlocks */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Active</span>
            <Activity className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-rose-700 tabular-nums">
            {metrics.active_deadlocks}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Involved right now</div>
        </div>

        {/* 4. Average Recovery Time */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Avg Recovery</span>
            <Clock className="w-3.5 h-3.5 text-sky-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-sky-700 tabular-nums">
            {metrics.avg_recovery_time_sec}<span className="text-xs text-slate-500 font-normal">s</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Detection to resumption</div>
        </div>

        {/* 5. Robots Involved in Deadlocks */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Robots Involved</span>
            <Users className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-700 tabular-nums">
            {metrics.robots_involved_count}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Distinct fleet units</div>
        </div>

        {/* 6. Tasks Reallocated */}
        <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] uppercase font-semibold tracking-wider">Reallocated</span>
            <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-indigo-700 tabular-nums">
            {metrics.tasks_reallocated}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Re-negotiated jobs</div>
        </div>
      </div>

      {/* History Log Table (Section 41 database `deadlocks` table) */}
      <div className="bg-white border border-sky-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-3.5 py-2.5 bg-sky-50/60 border-b border-sky-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-slate-500" />
            Database Deadlock Log (`deadlocks` table)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">SQLite Persistent Store</span>
        </div>

        <div className="overflow-x-auto max-h-56">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-sky-100 text-[10px] uppercase text-slate-500 font-semibold bg-sky-50/30">
                <th className="py-2 px-3">ID</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Cause</th>
                <th className="py-2 px-3">Robots Involved</th>
                <th className="py-2 px-3">Recovery Candidate</th>
                <th className="py-2 px-3">Recovery Action</th>
                <th className="py-2 px-3">Detected At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100 font-mono text-[11px]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-sans">
                    No deadlock history records in database yet. Click "Simulate Deadlock" above to generate a cycle.
                  </td>
                </tr>
              ) : (
                history.map((d) => {
                  let robots: string[] = [];
                  try {
                    robots = JSON.parse(d.robots_involved);
                  } catch {
                    robots = [d.robots_involved];
                  }

                  const isRec = d.status === 'RECOVERED';
                  const isDetect = d.status === 'DETECTED';

                  return (
                    <tr key={d.id} className="hover:bg-sky-50/50 transition-colors">
                      <td className="py-2 px-3 font-bold text-amber-800">{d.id}</td>
                      <td className="py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans font-semibold ${
                          isRec 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300' 
                            : isDetect
                            ? 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse'
                            : 'bg-sky-50 text-sky-800 border border-sky-300'
                        }`}>
                          {isRec ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" /> : <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />}
                          {d.status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-700 font-sans text-xs max-w-xs truncate" title={d.cause}>
                        {d.cause}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          {robots.map((rId) => (
                            <button
                              key={rId}
                              onClick={() => onFocusRobot && onFocusRobot(rId)}
                              className="text-sky-700 font-bold hover:underline cursor-pointer"
                            >
                              {rId}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-sky-800 font-semibold">
                        {d.recovery_robot ? (
                          <button
                            onClick={() => onFocusRobot && onFocusRobot(d.recovery_robot!)}
                            className="hover:underline cursor-pointer"
                          >
                            {d.recovery_robot}
                          </button>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 font-sans text-[11px] max-w-xs truncate" title={d.recovery_action || ''}>
                        {d.recovery_action || 'Pending action...'}
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[10px]">
                        {new Date(d.detected_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
