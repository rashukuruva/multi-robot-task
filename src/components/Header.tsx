import React from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Zap, 
  AlertTriangle, 
  Sliders, 
  FileCode, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

interface HeaderProps {
  isRunning: boolean;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onGenerateTasks: () => void;
  onAddMoreTasks?: () => void;
  onAssignTasks: () => void;
  onSimulateFailure: () => void;
  onSimulateDeadlock?: () => void;
  onTriggerP2P?: () => void;
  onSimulateTaskConflict?: () => void;
  onSimulateCollision?: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenWeights: () => void;
  onOpenPythonProject: () => void;
  isActionLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  speed,
  onStart,
  onPause,
  onReset,
  onGenerateTasks,
  onAddMoreTasks,
  onAssignTasks,
  onSimulateFailure,
  onSimulateDeadlock,
  onTriggerP2P,
  onSimulateTaskConflict,
  onSimulateCollision,
  onSpeedChange,
  onOpenWeights,
  onOpenPythonProject,
  isActionLoading = false,
}) => {
  return (
    <header className="border-b border-sky-200/90 bg-white/95 backdrop-blur-md px-4 lg:px-8 py-4 sticky top-0 z-40 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Brand Zone */}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="robot">🤖</span>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight text-slate-900">
              Multi-Robot Task Negotiation
            </h1>
          </div>
          <p className="text-xs lg:text-sm text-slate-500 mt-1 font-medium">
            500 Robots <span className="text-slate-300">·</span> 20 Initial Tasks (+20 On-Demand) <span className="text-slate-300">·</span> Autonomous P2P Negotiation <span className="text-slate-300">·</span> Conflict & Collision Management
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Start / Pause */}
          {isRunning ? (
            <button
              onClick={onPause}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
              title="Pause Simulation"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={onStart}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-sm shadow-sky-500/25 transition-all active:scale-95 cursor-pointer"
              title="Start Simulation"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Simulation</span>
            </button>
          )}

          {/* Reset */}
          <button
            onClick={onReset}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            title="Reset Simulation to initial state with 20 tasks"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset</span>
          </button>

          {/* Generate 20 Tasks */}
          <button
            onClick={onGenerateTasks}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-white hover:bg-sky-50 text-sky-800 border border-sky-200 transition-colors shadow-2xs cursor-pointer"
            title="Reset & generate 20 fresh tasks"
          >
            <RefreshCw className="w-3.5 h-3.5 text-sky-600" />
            <span>20 Tasks</span>
          </button>

          {/* Generate +20 More Tasks on demand */}
          {onAddMoreTasks && (
            <button
              onClick={onAddMoreTasks}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300/80 shadow-2xs transition-all active:scale-95 cursor-pointer"
              title="Add 20 more tasks into the arena only if you want"
            >
              <span className="text-sky-600 font-bold">+20</span>
              <span>More Tasks</span>
            </button>
          )}

          {/* Feature 1: P2P Task Auction */}
          {onTriggerP2P && (
            <button
              onClick={onTriggerP2P}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
              title="Conduct Decentralized Peer-to-Peer Task Auction"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              <span>P2P Auction</span>
            </button>
          )}

          {/* Feature 2: Simulate Task Conflict */}
          {onSimulateTaskConflict && (
            <button
              onClick={onSimulateTaskConflict}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors cursor-pointer"
              title="Simulate 3-robot contention on a task"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>Task Conflict</span>
            </button>
          )}

          {/* Feature 3: Simulate Collision Risk */}
          {onSimulateCollision && (
            <button
              onClick={onSimulateCollision}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 transition-colors cursor-pointer"
              title="Simulate real-time collision detection & reservation"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-600" />
              <span>Collision Risk</span>
            </button>
          )}

          {/* Simulate Failure */}
          <button
            onClick={onSimulateFailure}
            disabled={isActionLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
            title="Simulate random robot hardware fault to test fault recovery"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Simulate Failure</span>
          </button>

          {/* Section 39: Simulate Deadlock */}
          {onSimulateDeadlock && (
            <button
              onClick={onSimulateDeadlock}
              disabled={isActionLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-sm border border-amber-300 transition-all active:scale-95 cursor-pointer"
              title="Simulate intentional controlled 3-robot circular deadlock to demonstrate real-time detection & recovery"
            >
              <Zap className="w-3.5 h-3.5 fill-current text-white" />
              <span>Simulate Deadlock</span>
            </button>
          )}

          {/* Speed Toggle */}
          <div className="flex items-center bg-sky-50 rounded-lg p-0.5 border border-sky-200 text-xs font-medium">
            {[1, 2, 4].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  speed === s ? 'bg-sky-600 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Algorithmic Weights */}
          <button
            onClick={onOpenWeights}
            className="p-2 rounded-lg bg-white hover:bg-sky-50 text-slate-600 border border-slate-200 hover:border-sky-300 transition-colors shadow-2xs cursor-pointer"
            title="Inspect & Tune Negotiation Algorithm Weights"
          >
            <Sliders className="w-4 h-4 text-sky-600" />
          </button>

          {/* Python Project Code Modal */}
          <button
            onClick={onOpenPythonProject}
            className="flex items-center gap-1 px-3 py-2 rounded-lg bg-white hover:bg-sky-50 text-slate-700 border border-slate-200 hover:border-sky-300 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            title="View Python Flask Backend Architecture"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Python Backend</span>
          </button>
        </div>
      </div>
    </header>
  );
};
