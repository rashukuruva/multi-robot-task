import React, { useState } from 'react';
import { TaskConflictRecord, ResourceConflictRecord, P2PBid } from '../types.js';
import { AlertTriangle, ShieldCheck, Play, ArrowRight, Zap, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';

interface ConflictManagementPanelProps {
  taskConflicts: TaskConflictRecord[];
  resourceConflicts: ResourceConflictRecord[];
  onSimulateTaskConflict?: () => void;
  onSimulateResourceConflict?: () => void;
  onSelectTask?: (taskId: string) => void;
  onSelectRobot?: (robotId: string) => void;
  isLoading?: boolean;
}

export const ConflictManagementPanel: React.FC<ConflictManagementPanelProps> = ({
  taskConflicts,
  resourceConflicts,
  onSimulateTaskConflict,
  onSimulateResourceConflict,
  onSelectTask,
  onSelectRobot,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'task' | 'resource'>('task');

  // Helper to parse bids safely
  const parseBids = (bidsJson: string): P2PBid[] => {
    try {
      const parsed = JSON.parse(bidsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const parseContenders = (contendersJson: string): string[] => {
    try {
      const parsed = JSON.parse(contendersJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 flex flex-col h-full shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-sky-100 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-amber-50 text-amber-600 border border-amber-200/60">
            <AlertTriangle className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Conflict Management & Arbitration</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
                MULTI-AGENT RESOLUTION
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Autonomous resolution of contended tasks, shared resources & narrow path bottlenecks
            </p>
          </div>
        </div>

        {/* Action Triggers & Tabs */}
        <div className="flex items-center gap-2">
          {activeTab === 'task' ? (
            onSimulateTaskConflict && (
              <button
                onClick={onSimulateTaskConflict}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-500 text-white shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                title="Simulate 3-robot contention on a task"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Simulate Task Conflict</span>
              </button>
            )
          ) : (
            onSimulateResourceConflict && (
              <button
                onClick={onSimulateResourceConflict}
                disabled={isLoading}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                title="Simulate narrow path contention (PATH A)"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Simulate Path Conflict</span>
              </button>
            )
          )}

          <div className="flex items-center bg-sky-50/80 p-0.5 rounded-lg border border-sky-200/80 text-xs">
            <button
              onClick={() => setActiveTab('task')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'task' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Task Conflicts
            </button>
            <button
              onClick={() => setActiveTab('resource')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'resource' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Narrow Path Bottlenecks
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] pr-1 text-xs">
        {activeTab === 'task' ? (
          taskConflicts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              No active task conflicts. Click "Simulate Task Conflict" to test multi-robot contention.
            </div>
          ) : (
            taskConflicts.map((tc, idx) => {
              const bids = parseBids(tc.bids);
              const contenders = parseContenders(tc.contending_robots);
              const winnerId = tc.winner_id || (bids[0] ? bids[0].robot_id : 'R-???');
              const losers = contenders.filter(id => id !== winnerId);

              return (
                <div
                  key={tc.id || idx}
                  className="bg-amber-50/30 border border-amber-200/80 hover:border-amber-300 rounded-lg p-3 transition-colors shadow-2xs"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-amber-100 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-amber-800 font-bold font-mono text-xs uppercase bg-amber-100/80 border border-amber-300/80 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>⚠ TASK CONFLICT</span>
                      </span>
                      <span className="text-slate-500 text-xs">Task:</span>
                      <button
                        onClick={() => onSelectTask && onSelectTask(tc.task_id)}
                        className="font-mono font-bold text-amber-800 hover:underline cursor-pointer"
                      >
                        {tc.task_id}
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(tc.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Contending Robot Bids */}
                  <div className="bg-white rounded-md p-2.5 border border-sky-100 mb-2 font-mono shadow-2xs">
                    <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                      <span>Contending Bids</span>
                      <span className="text-slate-400 lowercase">{bids.length} competing robots</span>
                    </div>

                    <div className="space-y-1">
                      {bids.map(b => {
                        const isWinner = b.robot_id === winnerId;
                        return (
                          <div
                            key={b.robot_id}
                            className={`flex items-center justify-between text-xs px-2 py-1 rounded ${
                              isWinner
                                ? 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold'
                                : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => onSelectRobot && onSelectRobot(b.robot_id)}
                                className="text-sky-600 font-bold hover:underline cursor-pointer"
                              >
                                {b.robot_id}
                              </button>
                              <span className="text-slate-400">→</span>
                              <span className="text-slate-900 font-bold">Bid {b.bid_score.toFixed(1)}</span>
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Dist: {b.distance}u · Batt: {b.battery}% · Work: {b.workload}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Resolution Process & Assignment */}
                  <div className="bg-white border border-sky-100 rounded-md p-2.5 space-y-1.5 font-mono text-xs shadow-2xs">
                    <div className="text-slate-500 italic flex items-center gap-1.5 text-[11px]">
                      <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
                      <span>Resolving conflict via autonomous bid optimization...</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <span className="text-emerald-700 font-bold">Task assigned to</span>
                      <button
                        onClick={() => onSelectRobot && onSelectRobot(winnerId)}
                        className="font-bold text-sky-700 hover:underline cursor-pointer"
                      >
                        {winnerId}
                      </button>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{winnerId}</span>
                          <span className="text-slate-400">→</span>
                          <span>Assigned</span>
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-emerald-700">In Route</span>
                      </div>

                      {losers.map(lid => (
                        <div
                          key={lid}
                          className="flex items-center justify-between px-2 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600 text-xs"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-700 font-semibold">{lid}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-slate-600">Searching for another task</span>
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase">Available</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          resourceConflicts.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              No narrow path conflicts logged. Click "Simulate Path Conflict" to simulate shared bottleneck arbitration.
            </div>
          ) : (
            resourceConflicts.map((rc, idx) => (
              <div
                key={rc.id || idx}
                className="bg-rose-50/30 border border-rose-200/80 hover:border-rose-300 rounded-lg p-3 transition-colors shadow-2xs font-mono"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-rose-100 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-rose-800 font-bold text-xs uppercase bg-rose-100/80 border border-rose-300 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>⚠ NARROW PATH CONFLICT</span>
                    </span>
                    <span className="text-slate-700 text-xs font-bold">{rc.resource_id}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(rc.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="bg-white rounded-md p-2.5 border border-sky-100 mb-2 space-y-1.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectRobot && onSelectRobot(rc.robot1_id)}
                        className="text-sky-700 font-bold hover:underline cursor-pointer"
                      >
                        {rc.robot1_id}
                      </button>
                      <span className="text-slate-400 font-mono">─────►</span>
                      <span className="text-amber-700 font-bold">{rc.resource_id}</span>
                    </div>
                    {rc.robot1_id === rc.winner_id ? (
                      <span className="text-[10px] text-emerald-700 font-bold px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-200">
                        ACCESS GRANTED
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 animate-pulse">
                        WAITING
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-slate-700">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelectRobot && onSelectRobot(rc.robot2_id)}
                        className="text-sky-700 font-bold hover:underline cursor-pointer"
                      >
                        {rc.robot2_id}
                      </button>
                      <span className="text-slate-400 font-mono">─────►</span>
                      <span className="text-amber-700 font-bold">{rc.resource_id}</span>
                    </div>
                    {rc.robot2_id === rc.winner_id ? (
                      <span className="text-[10px] text-emerald-700 font-bold px-1.5 py-0.5 rounded bg-emerald-100 border border-emerald-200">
                        ACCESS GRANTED
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-700 font-bold px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 animate-pulse">
                        WAITING
                      </span>
                    )}
                  </div>
                </div>

                {/* Resolution Summary */}
                <div className="bg-white border border-sky-100 rounded-md p-2 text-xs space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Winner:</span>
                    <span className="text-emerald-700 font-bold">{rc.winner_id} (Proceeding)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Waiting Robot:</span>
                    <span className="text-amber-700 font-bold">{rc.waiting_robot_id} (Enters WAITING)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    {rc.reason}
                  </p>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
