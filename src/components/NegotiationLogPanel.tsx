import React, { useState } from 'react';
import { NegotiationLog, EventLog } from '../types.js';
import { Award, Zap, AlertTriangle, CheckCircle, Clock, ChevronRight } from 'lucide-react';

interface NegotiationLogPanelProps {
  logs: NegotiationLog[];
  events: EventLog[];
  onSelectTask?: (taskId: string) => void;
  onSelectRobot?: (robotId: string) => void;
}

export const NegotiationLogPanel: React.FC<NegotiationLogPanelProps> = ({
  logs,
  events,
  onSelectTask,
  onSelectRobot,
}) => {
  const [activeTab, setActiveTab] = useState<'negotiations' | 'events'>('negotiations');

  return (
    <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 flex flex-col h-full shadow-xs">
      {/* Header & Tabs */}
      <div className="flex items-center justify-between pb-3 border-b border-sky-100 mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">Live Negotiation Stream</h3>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-sky-50/80 p-0.5 rounded-lg border border-sky-200/80 text-xs">
          <button
            onClick={() => setActiveTab('negotiations')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'negotiations' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bids & Contracts
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'events' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fault & Audit Log
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[360px] pr-1 text-xs">
        {activeTab === 'negotiations' ? (
          logs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic">
              No negotiations recorded yet. Click "Assign Tasks" or "Start Simulation".
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={log.id || idx}
                className={`p-2.5 rounded-lg border transition-all ${
                  log.result === 'winner'
                    ? 'bg-purple-50/70 border-purple-200 text-slate-800 hover:border-purple-300 shadow-2xs'
                    : 'bg-white border-sky-100 text-slate-600 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {log.result === 'winner' ? (
                      <span className="p-1 rounded bg-purple-100 text-purple-700">
                        <Award className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="p-1 rounded bg-slate-100 text-slate-500">
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}

                    <div className="flex items-center gap-1.5 font-mono">
                      <button
                        onClick={() => onSelectTask && onSelectTask(log.task_id)}
                        className="text-amber-800 font-bold hover:underline cursor-pointer"
                      >
                        {log.task_id}
                      </button>
                      <span className="text-slate-400">→</span>
                      <button
                        onClick={() => onSelectRobot && onSelectRobot(log.robot_id)}
                        className="text-sky-700 font-bold hover:underline cursor-pointer"
                      >
                        {log.robot_id}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 tabular-nums bg-sky-50 border border-sky-100 px-1.5 py-0.5 rounded text-[11px]">
                      Bid: {log.bid_score}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      log.result === 'winner' ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' : 'text-slate-500'
                    }`}>
                      {log.result}
                    </span>
                  </div>
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                  <span>Dist: {log.distance}u</span>
                  <span>·</span>
                  <span>Battery: {log.battery}%</span>
                  <span>·</span>
                  <span>Workload: {log.workload} tasks</span>
                  <span className="ml-auto text-slate-400 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )
        ) : (
          events.length === 0 ? (
            <div className="text-center py-8 text-slate-400 italic">No events recorded.</div>
          ) : (
            events.map((evt, idx) => {
              const isFailure = evt.event_type.includes('fail') || evt.message.includes('FAILED');
              const isRealloc = evt.event_type.includes('reassign') || evt.message.includes('RE-NEGOTIATION');
              const isCompleted = evt.event_type.includes('completed');

              return (
                <div
                  key={evt.id || idx}
                  className={`p-2 rounded-lg border text-xs flex items-start gap-2 shadow-2xs ${
                    isFailure
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : isRealloc
                      ? 'bg-amber-50 border-amber-200 text-amber-900'
                      : isCompleted
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-white border-sky-100 text-slate-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isFailure ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    ) : isCompleted ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ) : isRealloc ? (
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="leading-snug">{evt.message}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};
