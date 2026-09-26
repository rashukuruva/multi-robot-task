import React from 'react';
import { Statistics, GroupStat } from '../types.js';
import { BarChart3, PieChart, Battery, TrendingUp, Users } from 'lucide-react';

interface AnalyticsSectionProps {
  stats: Statistics;
  onSelectGroup: (groupId: string) => void;
}

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  stats,
  onSelectGroup,
}) => {
  // Battery distribution data
  const battData = [
    { label: '80–100%', count: stats.battery_distribution['80-100%'] || 0, color: '#34d399' },
    { label: '60–80%', count: stats.battery_distribution['60-80%'] || 0, color: '#38bdf8' },
    { label: '40–60%', count: stats.battery_distribution['40-60%'] || 0, color: '#fbbf24' },
    { label: '20–40%', count: stats.battery_distribution['20-40%'] || 0, color: '#fb923c' },
    { label: '0–20%', count: stats.battery_distribution['0-20%'] || 0, color: '#f87171' },
  ];
  const maxBattCount = Math.max(1, ...battData.map(b => b.count));

  // Robot fleet status data
  const robotStatuses = [
    { label: 'Idle', count: stats.idle_robots, color: '#94a3b8' },
    { label: 'Moving', count: stats.busy_robots, color: '#38bdf8' },
    { label: 'Failed', count: stats.failed_robots, color: '#f87171' },
  ];
  const totalRobots = Math.max(1, stats.total_robots);

  // Task status data
  const taskStatuses = [
    { label: 'Completed', count: stats.completed_tasks, color: '#34d399' },
    { label: 'In Progress', count: stats.assigned_tasks, color: '#38bdf8' },
    { label: 'Pending', count: stats.pending_tasks, color: '#fbbf24' },
  ];
  const totalTasks = Math.max(1, stats.total_tasks);

  return (
    <div className="space-y-4 my-6">
      {/* 1. Robot Groups Section (Section 14) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-800 tracking-tight">
              Fleet Grouping Architecture (500 Robots · 4 Groups)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Click any group card to inspect its 125 robots</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.groups.map((group) => (
            <div
              key={group.group_id}
              onClick={() => onSelectGroup(group.group_id)}
              className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-3.5 hover:border-sky-400 hover:shadow-md transition-all cursor-pointer shadow-xs group"
            >
              <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                <span className="font-bold text-sm text-slate-800 group-hover:text-sky-600 font-mono">
                  {group.group_id}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">125 Robots</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                <div className="bg-sky-50/70 p-1.5 rounded-lg border border-sky-100">
                  <span className="text-[10px] text-slate-500 uppercase font-medium block">Idle</span>
                  <span className="font-mono font-bold text-slate-700 tabular-nums">{group.idle}</span>
                </div>
                <div className="bg-sky-50/70 p-1.5 rounded-lg border border-sky-100">
                  <span className="text-[10px] text-sky-700 uppercase font-medium block">Busy</span>
                  <span className="font-mono font-bold text-sky-600 tabular-nums">{group.busy}</span>
                </div>
                <div className="bg-sky-50/70 p-1.5 rounded-lg border border-sky-100">
                  <span className="text-[10px] text-slate-500 uppercase font-medium block">Failed</span>
                  <span className={`font-mono font-bold tabular-nums ${group.failed > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {group.failed}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                <div style={{ width: `${(group.idle / 125) * 100}%` }} className="bg-slate-400 h-full" />
                <div style={{ width: `${(group.busy / 125) * 100}%` }} className="bg-sky-500 h-full" />
                <div style={{ width: `${(group.failed / 125) * 100}%` }} className="bg-rose-500 h-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Statistical Visualizations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Chart A: Task Allocation Pipeline */}
        <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Task Pipeline Distribution</h4>
            </div>
            <span className="text-xs font-mono text-slate-500">{stats.total_tasks} Tasks</span>
          </div>

          <div className="space-y-2.5 my-2">
            {taskStatuses.map(item => {
              const pct = Number(((item.count / totalTasks) * 100).toFixed(1));
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart B: Robot Fleet Status */}
        <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Robot Fleet Utilization</h4>
            </div>
            <span className="text-xs font-mono text-slate-500">{stats.total_robots} Units</span>
          </div>

          <div className="space-y-2.5 my-2">
            {robotStatuses.map(item => {
              const pct = Number(((item.count / totalRobots) * 100).toFixed(1));
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {item.count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart C: Battery Distribution Histogram */}
        <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 shadow-xs md:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-100">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-amber-500" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Battery Health Spectrum</h4>
            </div>
            <span className="text-xs text-slate-500">500 Robots</span>
          </div>

          <div className="space-y-2 my-2">
            {battData.map(item => {
              const barWidth = (item.count / maxBattCount) * 100;
              return (
                <div key={item.label} className="flex items-center gap-2 text-xs">
                  <span className="w-16 font-mono text-slate-500 text-[11px]">{item.label}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded overflow-hidden border border-slate-200">
                    <div
                      className="h-full rounded transition-all duration-300"
                      style={{ width: `${barWidth}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <span className="w-8 text-right font-mono text-slate-700 tabular-nums text-[11px] font-semibold">
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
