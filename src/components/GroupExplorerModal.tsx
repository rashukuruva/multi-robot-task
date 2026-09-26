import React, { useState, useEffect } from 'react';
import { Robot } from '../types.js';
import { Users, Search, Filter, Bot, Battery, CheckCircle, AlertOctagon } from 'lucide-react';

interface GroupExplorerModalProps {
  groupId: string | null;
  onClose: () => void;
  onSelectRobot: (robot: Robot) => void;
}

export const GroupExplorerModal: React.FC<GroupExplorerModalProps> = ({
  groupId,
  onClose,
  onSelectRobot,
}) => {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    setLoading(true);
    fetch(`/api/robots?group=${encodeURIComponent(groupId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRobots(data.robots);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (!groupId) return null;

  const filteredRobots = robots.filter(r => {
    const matchesSearch = r.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-950 text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">{groupId} Fleet Inspector</h3>
              <p className="text-xs text-slate-400">
                125 Robots allocated to this regional quadrant
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/60 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search robot ID (e.g. R-024)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            {['all', 'idle', 'moving', 'failed'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md capitalize transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-sky-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-400 font-mono">
            Showing {filteredRobots.length} of {robots.length}
          </span>
        </div>

        {/* Robot Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500">Loading robots from SQLite...</div>
          ) : filteredRobots.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 italic">No robots matching query.</div>
          ) : (
            filteredRobots.map((robot) => (
              <div
                key={robot.id}
                onClick={() => {
                  onSelectRobot(robot);
                  onClose();
                }}
                className="bg-slate-950 border border-slate-800/80 hover:border-sky-500 p-3 rounded-xl transition-all cursor-pointer shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-white font-mono text-xs">{robot.id}</span>
                  </div>
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                    robot.status === 'failed' ? 'bg-rose-950 text-rose-400' :
                    robot.status === 'moving' ? 'bg-sky-950 text-sky-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {robot.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Battery className={`w-3 h-3 ${robot.battery > 40 ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span className="font-mono text-slate-200">{robot.battery}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span>{robot.tasks_completed} done</span>
                  </div>
                </div>

                {robot.current_task && (
                  <div className="mt-2 text-[10px] text-amber-400 font-mono bg-amber-950/30 px-1.5 py-0.5 rounded border border-amber-900/40">
                    Navigating to: {robot.current_task}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
