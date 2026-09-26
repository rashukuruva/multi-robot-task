import React from 'react';
import { Statistics, DeadlockMetrics } from '../types.js';
import { Cpu, CheckCircle2, Clock, Activity, AlertOctagon, Layers, Zap, Radio, ShieldAlert, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';

interface StatCardsProps {
  stats: Statistics;
  deadlockMetrics?: DeadlockMetrics;
  deadlockStatus?: 'NORMAL' | 'WAITING' | 'BLOCKED' | 'DEADLOCK_DETECTED' | 'RECOVERING' | 'RECOVERED';
  onFilterStatus?: (status: string) => void;
  onScrollToDeadlocks?: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({ 
  stats, 
  deadlockMetrics, 
  deadlockStatus = 'NORMAL',
  onFilterStatus,
  onScrollToDeadlocks 
}) => {
  // Status badge styling
  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    NORMAL: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    WAITING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    BLOCKED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300' },
    DEADLOCK_DETECTED: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
    RECOVERING: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' },
    RECOVERED: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
  };

  const currentStyle = statusColors[deadlockStatus] || statusColors.NORMAL;

  return (
    <div className="space-y-2.5 my-4">
      {/* Primary 8 Fleet & Task Stats */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* 1. Total Robots */}
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition-all shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Robots</span>
          <Cpu className="w-3.5 h-3.5 text-sky-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {stats.total_robots}
          </span>
          <span className="text-[10px] text-slate-400">units</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          4 Groups · 125 each
        </div>
      </div>

      {/* 2. Total Tasks */}
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-sky-300 hover:shadow-md transition-all shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tasks</span>
          <Layers className="w-3.5 h-3.5 text-sky-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-900 tabular-nums">
            {stats.total_tasks}
          </span>
          <span className="text-[10px] text-slate-400">jobs</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500">
          In SQLite DB
        </div>
      </div>

      {/* 3. Idle Robots */}
      <div 
        onClick={() => onFilterStatus && onFilterStatus('idle')}
        className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-sky-400 hover:shadow-md transition-all cursor-pointer shadow-xs group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider group-hover:text-slate-700">Idle Robots</span>
          <Radio className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-slate-700 tabular-nums">
            {stats.idle_robots}
          </span>
          <span className="text-[10px] text-slate-400">ready</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Standby fleet
        </div>
      </div>

      {/* 4. Busy Robots */}
      <div 
        onClick={() => onFilterStatus && onFilterStatus('moving')}
        className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-sky-400 hover:shadow-md transition-all cursor-pointer shadow-xs group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider group-hover:text-sky-600">Busy Robots</span>
          <Activity className="w-3.5 h-3.5 text-sky-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-sky-600 tabular-nums">
            {stats.busy_robots}
          </span>
          <span className="text-[10px] text-sky-700">active</span>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span> Moving to tasks
        </div>
      </div>

      {/* 5. Failed Robots */}
      <div 
        onClick={() => onFilterStatus && onFilterStatus('failed')}
        className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-rose-400 hover:shadow-md transition-all cursor-pointer shadow-xs group"
      >
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider group-hover:text-rose-600">Failed Robots</span>
          <AlertOctagon className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-rose-600 tabular-nums">
            {stats.failed_robots}
          </span>
          <span className="text-[10px] text-rose-400">faults</span>
        </div>
        <div className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Reallocated
        </div>
      </div>

      {/* 6. Completed Tasks */}
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition-all shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Completed Tasks</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-emerald-600 tabular-nums">
            {stats.completed_tasks}
          </span>
          <span className="text-[10px] text-emerald-700">done</span>
        </div>
        <div className="mt-1 text-[11px] text-emerald-700 font-medium">
          {((stats.completed_tasks / Math.max(1, stats.total_tasks)) * 100).toFixed(1)}% finished
        </div>
      </div>

      {/* 7. Pending Tasks */}
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Tasks</span>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-amber-600 tabular-nums">
            {stats.pending_tasks}
          </span>
          <span className="text-[10px] text-amber-700">queue</span>
        </div>
        <div className="mt-1 text-[11px] text-amber-700 font-medium">
          Awaiting auction
        </div>
      </div>

      {/* 8. Negotiations */}
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 flex flex-col justify-between hover:border-purple-400 hover:shadow-md transition-all shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[11px] font-semibold uppercase tracking-wider">Negotiations</span>
          <Zap className="w-3.5 h-3.5 text-purple-600" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="text-2xl font-bold font-mono tracking-tight text-purple-700 tabular-nums">
            {stats.negotiations}
          </span>
          <span className="text-[10px] text-purple-500">auctions</span>
        </div>
        <div className="mt-1 text-[11px] text-purple-700 font-medium">
          CNP Contracts
        </div>
      </div>
      </section>

      {/* Section 33: Deadlock Status Bar with Dynamic Counters */}
      <div 
        onClick={onScrollToDeadlocks}
        className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs hover:border-sky-300 hover:shadow-sm transition-all cursor-pointer"
      >
        {/* Left: Section 33 State */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            System Deadlock Status:
          </span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${currentStyle.bg} ${currentStyle.text} ${currentStyle.border}`}>
            {deadlockStatus === 'DEADLOCK_DETECTED' && <AlertTriangle className="w-3 h-3 animate-pulse" />}
            {deadlockStatus === 'RECOVERING' && <RefreshCw className="w-3 h-3 animate-spin" />}
            {deadlockStatus === 'NORMAL' && <CheckCircle className="w-3 h-3" />}
            <span>{deadlockStatus}</span>
          </span>
        </div>

        {/* Center / Right: Dynamic Counters */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Deadlocks Detected:</span>
            <span className="font-bold text-amber-700 text-sm tabular-nums">
              {deadlockMetrics ? deadlockMetrics.deadlocks_detected : 0}
            </span>
          </div>

          <span className="text-slate-300">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Active Deadlocks:</span>
            <span className={`font-bold text-sm tabular-nums ${
              (deadlockMetrics?.active_deadlocks || 0) > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-700'
            }`}>
              {deadlockMetrics ? deadlockMetrics.active_deadlocks : 0}
            </span>
          </div>

          <span className="text-slate-300">·</span>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-[11px]">Recovered Deadlocks:</span>
            <span className="font-bold text-emerald-700 text-sm tabular-nums">
              {deadlockMetrics ? deadlockMetrics.recovered_deadlocks : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
