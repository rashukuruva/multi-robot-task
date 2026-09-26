import React from 'react';
import { Robot } from '../types.js';
import { Bot, Battery, Navigation, CheckCircle, AlertTriangle, Layers, Zap } from 'lucide-react';

interface RobotDetailPanelProps {
  robot: Robot | null;
  onFailRobot: (robotId: string) => void;
  onFocusTask: (taskId: string) => void;
  onClose: () => void;
}

export const RobotDetailPanel: React.FC<RobotDetailPanelProps> = ({
  robot,
  onFailRobot,
  onFocusTask,
  onClose,
}) => {
  if (!robot) {
    return (
      <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 flex flex-col items-center justify-center text-center min-h-[220px] shadow-xs">
        <Bot className="w-9 h-9 text-sky-400 mb-2" />
        <h4 className="text-sm font-semibold text-slate-800">Robot Inspector</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
          Click any active robot or hub to inspect real-time telemetry, battery, and bids.
        </p>
      </div>
    );
  }

  // Calculate distance to target if moving
  let distanceToTarget = 0;
  if (robot.target_x != null && robot.target_y != null) {
    distanceToTarget = Number(Math.hypot(robot.target_x - robot.x, robot.target_y - robot.y).toFixed(1));
  }

  return (
    <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 relative shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-sky-100">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${robot.failed ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-mono">{robot.id}</h4>
            <span className="text-[11px] text-slate-500">{robot.group_id}</span>
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
        {/* Status */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Status</span>
          <span className={`font-semibold capitalize flex items-center gap-1 mt-0.5 ${
            robot.status === 'failed' ? 'text-rose-600' :
            robot.status === 'moving' ? 'text-sky-700' :
            robot.status === 'negotiating' ? 'text-amber-700' : 'text-slate-700'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              robot.status === 'failed' ? 'bg-rose-500' :
              robot.status === 'moving' ? 'bg-sky-500 animate-pulse' :
              robot.status === 'negotiating' ? 'bg-amber-500' : 'bg-slate-400'
            }`}></span>
            {robot.status}
          </span>
        </div>

        {/* Battery */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Battery</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Battery className={`w-3.5 h-3.5 ${robot.battery > 40 ? 'text-emerald-600' : 'text-rose-600'}`} />
            <span className="font-mono font-bold text-slate-900 tabular-nums">{robot.battery}%</span>
          </div>
        </div>

        {/* Current Task */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Current Task</span>
          {robot.current_task ? (
            <button
              onClick={() => onFocusTask(robot.current_task!)}
              className="text-amber-700 font-mono font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              {robot.current_task}
              <Navigation className="w-3 h-3 text-amber-600" />
            </button>
          ) : (
            <span className="text-slate-400 italic mt-0.5 block">None</span>
          )}
        </div>

        {/* Tasks Completed */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Completed</span>
          <div className="flex items-center gap-1.5 mt-0.5 text-emerald-700 font-bold font-mono">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>{robot.tasks_completed}</span>
          </div>
        </div>

        {/* Coordinates */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Position</span>
          <span className="font-mono text-slate-700 mt-0.5 block">
            ({Math.round(robot.x)}, {Math.round(robot.y)})
          </span>
        </div>

        {/* Distance Remaining */}
        <div className="bg-sky-50/50 p-2 rounded-lg border border-sky-100">
          <span className="text-slate-500 text-[10px] block uppercase font-medium">Distance To Target</span>
          <span className="font-mono text-slate-700 mt-0.5 block">
            {distanceToTarget > 0 ? `${distanceToTarget} u` : '0 u'}
          </span>
        </div>
      </div>

      {/* Action button: Fail Robot */}
      {robot.status !== 'failed' && (
        <button
          onClick={() => onFailRobot(robot.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span>Simulate Hardware Failure</span>
        </button>
      )}
    </div>
  );
};
