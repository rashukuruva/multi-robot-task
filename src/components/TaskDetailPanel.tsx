import React from 'react';
import { Task } from '../types.js';
import { Layers, Bot, Award, MapPin, Zap } from 'lucide-react';

interface TaskDetailPanelProps {
  task: Task | null;
  onFocusRobot: (robotId: string) => void;
  onClose: () => void;
}

export const TaskDetailPanel: React.FC<TaskDetailPanelProps> = ({
  task,
  onFocusRobot,
  onClose,
}) => {
  if (!task) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[220px] shadow-xs">
        <Layers className="w-9 h-9 text-sky-400 mb-2" />
        <h4 className="text-sm font-semibold text-slate-800">Task Inspector</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
          Click any task marker on the arena to inspect contract bids, priorities, and assigned robot.
        </p>
      </div>
    );
  }

  // Priority color styling
  const priorityColor =
    task.priority === 'Critical' ? 'text-rose-700 bg-rose-50 border-rose-200' :
    task.priority === 'High' ? 'text-amber-800 bg-amber-50 border-amber-200' :
    task.priority === 'Medium' ? 'text-yellow-800 bg-yellow-50 border-yellow-200' :
    'text-sky-700 bg-sky-50 border-sky-200';

  return (
    <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 relative shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200/60">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-mono">{task.id}</h4>
            <span className="text-[11px] text-slate-500">
              Created {new Date(task.created_at).toLocaleTimeString()}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-slate-700 px-1.5 py-0.5 rounded cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5 my-3 text-xs">
        {/* Priority */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Priority</span>
          <span className={`inline-block px-1.5 py-0.5 rounded border text-[11px] font-semibold mt-0.5 ${priorityColor}`}>
            {task.priority}
          </span>
        </div>

        {/* Status */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Status</span>
          <span className={`font-semibold capitalize flex items-center gap-1 mt-0.5 ${
            task.status === 'completed' ? 'text-emerald-700' :
            task.status === 'in_progress' ? 'text-sky-700' : 'text-amber-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              task.status === 'completed' ? 'bg-emerald-500' :
              task.status === 'in_progress' ? 'bg-sky-500 animate-pulse' : 'bg-amber-500'
            }`}></span>
            {task.status.replace('_', ' ')}
          </span>
        </div>

        {/* Assigned Robot */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100 col-span-2">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Assigned Robot</span>
          {task.assigned_robot ? (
            <button
              onClick={() => onFocusRobot(task.assigned_robot!)}
              className="text-sky-700 font-mono font-bold hover:underline flex items-center gap-1.5 mt-0.5 cursor-pointer"
            >
              <Bot className="w-3.5 h-3.5 text-sky-600" />
              <span>{task.assigned_robot}</span>
              <span className="text-[10px] text-slate-400 font-normal">· Click to focus</span>
            </button>
          ) : (
            <span className="text-amber-700 italic mt-0.5 block">Unassigned (In queue)</span>
          )}
        </div>

        {/* Coordinates */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Coordinates</span>
          <div className="flex items-center gap-1 text-slate-700 font-mono mt-0.5">
            <MapPin className="w-3 h-3 text-slate-400" />
            <span>({Math.round(task.x)}, {Math.round(task.y)})</span>
          </div>
        </div>

        {/* Winning Bid */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Winning Bid</span>
          <div className="flex items-center gap-1 text-amber-700 font-mono font-bold mt-0.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{task.winning_bid != null ? `${task.winning_bid} pts` : 'Pending'}</span>
          </div>
        </div>
      </div>

      {task.status === 'completed' && task.completed_at && (
        <div className="mt-2 text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 font-medium">
          Task completed at {new Date(task.completed_at).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};
