import React, { useState } from 'react';
import { WaitForGraphData, DeadlockRecord, DeadlockMetrics } from '../types.js';
import { 
  GitCommit, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  RefreshCw, 
  Play, 
  Sliders, 
  ArrowRight, 
  Cpu, 
  Zap, 
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

interface WaitForGraphPanelProps {
  graph: WaitForGraphData;
  activeDeadlock: DeadlockRecord | null;
  metrics: DeadlockMetrics;
  recoveryPolicy: string;
  onSimulateDeadlock: (type: 'circular_waiting' | 'robot_blocking' | 'resource_deadlock') => void;
  onRecover: (id: string) => void;
  onChangePolicy: (policy: any) => void;
  onSelectRobot?: (robotId: string) => void;
  isActionLoading?: boolean;
}

export const WaitForGraphPanel: React.FC<WaitForGraphPanelProps> = ({
  graph,
  activeDeadlock,
  metrics,
  recoveryPolicy,
  onSimulateDeadlock,
  onRecover,
  onChangePolicy,
  onSelectRobot,
  isActionLoading = false,
}) => {
  const [selectedScenario, setSelectedScenario] = useState<'circular_waiting' | 'robot_blocking' | 'resource_deadlock'>('circular_waiting');
  const hasCycle = graph.hasCycle || (activeDeadlock != null && activeDeadlock.status !== 'RECOVERED');

  // Parse robots in cycle
  const cycleList: string[] = graph.cycle.length > 0 
    ? graph.cycle 
    : (activeDeadlock ? (() => {
        try {
          return JSON.parse(activeDeadlock.robots_involved);
        } catch {
          return [];
        }
      })() : []);

  return (
    <section className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 space-y-4 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-sky-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-lg ${hasCycle ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'}`}>
            <GitCommit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <span>Live Wait-For Graph</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                hasCycle 
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                {hasCycle ? 'CYCLE DETECTED' : 'GRAPH ACYCLIC'}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Real-time resource dependency tracking & DFS cycle analysis across 500 robots
            </p>
          </div>
        </div>

        {/* Action Controls: Scenario simulator */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as any)}
            className="bg-white border border-sky-200 text-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:border-sky-400 focus:outline-hidden cursor-pointer shadow-2xs"
          >
            <option value="circular_waiting">1. Circular Waiting (3-5 Robots)</option>
            <option value="robot_blocking">2. Robot-to-Robot Blocking</option>
            <option value="resource_deadlock">3. Resource / Task Deadlock</option>
          </select>

          <button
            onClick={() => onSimulateDeadlock(selectedScenario)}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Intentionally trigger controlled deadlock scenario to test detection and recovery"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Deadlock</span>
          </button>
        </div>
      </div>

      {/* Main Graph Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Visual Graph Diagram / ASCII box (Section 42) */}
        <div className="lg:col-span-8 bg-sky-50/30 border border-sky-200/80 rounded-xl p-4 flex flex-col justify-between min-h-[220px] shadow-2xs">
          {/* Status Banner */}
          <div className="flex items-center justify-between border-b border-sky-100 pb-2 mb-3">
            <span className="text-[11px] font-mono font-medium text-slate-500 uppercase tracking-wider">
              Dependency Graph Representation
            </span>

            {hasCycle ? (
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-1 rounded border border-rose-300 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>⚠ DEADLOCK DETECTED: Circular dependency found</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>✓ No Deadlock Detected</span>
              </div>
            )}
          </div>

          {/* Graph Visualization */}
          {hasCycle && cycleList.length >= 2 ? (
            <div className="my-auto py-2 flex flex-col items-center">
              {/* Circular Waiting SVG / Node Chain */}
              <div className="w-full max-w-xl mx-auto flex flex-col items-center gap-3">
                <div className="text-[11px] font-mono text-amber-900 font-bold bg-amber-100 border border-amber-300 px-3 py-1 rounded-full">
                  Detected Cycle Sequence: {cycleList.join(' → ')} → {cycleList[0]}
                </div>

                {/* Interactive Node Flow */}
                <div className="flex items-center justify-center gap-2 flex-wrap w-full py-2">
                  {cycleList.map((robotId, i) => (
                    <React.Fragment key={robotId}>
                      <div 
                        onClick={() => onSelectRobot && onSelectRobot(robotId)}
                        className="group flex flex-col items-center bg-white border-2 border-amber-400 hover:border-amber-500 rounded-lg p-2.5 min-w-[90px] shadow-xs cursor-pointer transition-all hover:scale-105"
                      >
                        <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-800 group-hover:text-amber-900">
                          <Cpu className="w-3.5 h-3.5 text-amber-600" />
                          <span>{robotId}</span>
                        </div>
                        <span className="text-[10px] text-rose-600 font-semibold mt-0.5">BLOCKED</span>
                        <span className="text-[9px] text-slate-400">waiting for unit</span>
                      </div>

                      <div className="flex flex-col items-center text-amber-500 px-1">
                        <ArrowRight className="w-4 h-4 animate-pulse" />
                        <span className="text-[9px] font-mono text-amber-600 font-semibold">waits</span>
                      </div>
                    </React.Fragment>
                  ))}

                  {/* Closing cycle loop back badge */}
                  <div className="flex flex-col items-center bg-rose-50 border border-rose-300 rounded-lg p-2 min-w-[85px]">
                    <span className="text-[10px] font-mono text-rose-700 font-bold">↺ Back to</span>
                    <span className="text-xs font-mono font-bold text-rose-900">{cycleList[0]}</span>
                  </div>
                </div>

                {/* ASCII Diagram format as requested in Section 42 */}
                <div className="bg-slate-900 rounded border border-slate-700 p-2.5 font-mono text-[11px] text-amber-300 w-full overflow-x-auto leading-relaxed shadow-sm">
                  <div className="text-slate-400 text-[10px] mb-1 font-sans">Wait-For Graph ASCII Projection:</div>
                  {cycleList.map((r, idx) => (
                    <div key={idx} className="pl-4">
                      {idx === 0 ? '┌─────────┐' : '     ↓    \n┌─────────┐'}
                      <div>{`│  ${r}  │  ──> waits on resource/corridor`}</div>
                      <div>{'└────┬────┘'}</div>
                    </div>
                  ))}
                  <div className="pl-4 text-rose-400 font-bold">
                    {'     └──────────────► ' + cycleList[0] + ' (Deadlock Cycle)'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 mb-1">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">
                Wait-For Graph is Clean & Acyclic
              </h4>
              <p className="text-xs text-slate-500 max-w-md">
                No circular resource contentions or routing blockages detected. Robots are moving autonomously along negotiated corridors.
              </p>
              <button
                onClick={() => onSimulateDeadlock('circular_waiting')}
                className="mt-2 text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded cursor-pointer transition-colors shadow-2xs"
              >
                Click "Simulate Deadlock" above to generate a 3-robot cycle
              </button>
            </div>
          )}

          {/* Active Edges List */}
          <div className="mt-3 pt-2.5 border-t border-sky-100 text-[11px] text-slate-500 flex items-center justify-between flex-wrap gap-2">
            <span>
              Active Dependencies: <strong className="text-slate-800">{graph.edges.length}</strong> edges
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              Traversal: DFS cycle check (O(V+E) every 1.0s)
            </span>
          </div>
        </div>

        {/* Right: Recovery Policy Configuration & Instant Metrics */}
        <div className="lg:col-span-4 flex flex-col justify-between space-y-3">
          {/* Recovery Policy Box (Section 36) */}
          <div className="bg-sky-50/40 border border-sky-200/80 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-sky-600" />
                Recovery Policy
              </span>
              <span className="text-[10px] text-sky-700 font-mono font-semibold">Configurable</span>
            </div>

            <p className="text-[11px] text-slate-500">
              When deadlock is detected, select which robot in the cycle will yield its reservations:
            </p>

            <div className="space-y-1.5 pt-1">
              {[
                { id: 'lowest_priority', label: 'Lowest Priority / Workload', desc: 'Yields robot with least completed tasks' },
                { id: 'lowest_battery', label: 'Lowest Battery', desc: 'Yields robot with most depleted power reserve' },
                { id: 'least_task_progress', label: 'Least Task Progress', desc: 'Yields robot furthest from destination' },
                { id: 'shortest_alternative_route', label: 'Shortest Alternative Route', desc: 'Yields robot with quickest bypass path' },
              ].map((pol) => (
                <label
                  key={pol.id}
                  className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                    recoveryPolicy === pol.id
                      ? 'bg-sky-100 border-sky-300 text-sky-950 font-medium shadow-2xs'
                      : 'bg-white border-sky-100 text-slate-600 hover:border-sky-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="recovery_policy"
                    value={pol.id}
                    checked={recoveryPolicy === pol.id}
                    onChange={(e) => onChangePolicy(e.target.value)}
                    className="mt-0.5 accent-sky-600 cursor-pointer"
                  />
                  <div>
                    <div className="text-[11px] text-slate-900 font-semibold">{pol.label}</div>
                    <div className="text-[10px] text-slate-500">{pol.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div className="bg-white border border-sky-200 rounded-xl p-3 grid grid-cols-2 gap-2 text-xs shadow-2xs">
            <div className="bg-sky-50/50 p-2 rounded border border-sky-100">
              <span className="text-[10px] uppercase text-slate-500 block">Total Detected</span>
              <span className="text-base font-bold font-mono text-amber-700 tabular-nums">
                {metrics.deadlocks_detected}
              </span>
            </div>
            <div className="bg-sky-50/50 p-2 rounded border border-sky-100">
              <span className="text-[10px] uppercase text-slate-500 block">Recovered</span>
              <span className="text-base font-bold font-mono text-emerald-700 tabular-nums">
                {metrics.recovered_deadlocks}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
