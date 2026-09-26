import React from 'react';
import { DeadlockRecord } from '../types.js';
import { AlertTriangle, RefreshCw, CheckCircle2, ArrowRight, ShieldAlert, Cpu } from 'lucide-react';

interface DeadlockWarningBannerProps {
  deadlock: DeadlockRecord | null;
  onRecover: (id: string) => void;
  onFocusRobot?: (id: string) => void;
  isActionLoading?: boolean;
}

export const DeadlockWarningBanner: React.FC<DeadlockWarningBannerProps> = ({
  deadlock,
  onRecover,
  onFocusRobot,
  isActionLoading = false,
}) => {
  if (!deadlock || deadlock.status === 'RECOVERED') {
    return null;
  }

  let robots: string[] = [];
  try {
    robots = JSON.parse(deadlock.robots_involved);
  } catch {
    robots = [deadlock.robots_involved];
  }

  const isRecovering = deadlock.status === 'RECOVERING';

  return (
    <div className="bg-amber-50/95 backdrop-blur-md border-2 border-amber-300 rounded-xl p-4 shadow-lg shadow-amber-500/10 animate-in slide-in-from-top-4 duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Side: Alert Title & ID */}
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 border border-amber-300 shadow-xs animate-pulse">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500 text-white tracking-wider uppercase shadow-xs">
                ⚠ DEADLOCK DETECTED
              </span>
              <span className="text-xs font-mono font-bold text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-300">
                Deadlock ID: {deadlock.id}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                isRecovering 
                  ? 'bg-sky-100 text-sky-800 border border-sky-300 animate-pulse'
                  : 'bg-rose-100 text-rose-800 border border-rose-300'
              }`}>
                {isRecovering ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin text-sky-600" />
                    Status: Recovery in progress
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Status: Deadlock Active
                  </>
                )}
              </span>
            </div>

            <div className="text-xs text-slate-700 flex items-center gap-2 flex-wrap pt-0.5">
              <span className="font-semibold text-slate-600">Robots involved:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {robots.map((rId, idx) => (
                  <React.Fragment key={rId}>
                    <button
                      onClick={() => onFocusRobot && onFocusRobot(rId)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono font-bold cursor-pointer transition-colors shadow-xs"
                      title="Inspect robot"
                    >
                      <Cpu className="w-3 h-3 text-amber-600" />
                      {rId}
                    </button>
                    {idx < robots.length - 1 && (
                      <span className="text-amber-600 font-bold text-xs">→</span>
                    )}
                  </React.Fragment>
                ))}
                {robots.length > 0 && (
                  <span className="text-amber-700 font-bold text-xs">↺ (Cycle)</span>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-700 pt-0.5">
              <span className="font-semibold text-slate-600">Cause: </span>
              <span className="text-amber-900 font-medium">{deadlock.cause}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Recovery Actions & Workflow Progress */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {!isRecovering && (
            <button
              onClick={() => onRecover(deadlock.id)}
              disabled={isActionLoading}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isActionLoading ? 'animate-spin' : ''}`} />
              <span>Execute Automated Recovery</span>
            </button>
          )}

          {isRecovering && (
            <div className="px-3.5 py-2 rounded-lg bg-sky-50 border border-sky-300 text-sky-800 text-xs flex items-center gap-2 shadow-xs">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
              <div className="text-[11px]">
                <span className="font-bold">Recovery Sequence Active:</span> Releasing reservations & re-routing candidate...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Workflow Steps Indicator */}
      <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1.5 text-[10px] text-center">
        {[
          { label: '1. Detect', active: true, done: true },
          { label: '2. Warn Alert', active: true, done: true },
          { label: '3. Identify Cycle', active: true, done: true },
          { label: '4. Start Recovery', active: isRecovering, done: false },
          { label: '5. Release Locks', active: isRecovering, done: false },
          { label: '6. Re-route Robot', active: isRecovering, done: false },
          { label: '7. Re-negotiate', active: isRecovering, done: false },
          { label: '8. Resume Fleet', active: false, done: false },
        ].map((step, idx) => (
          <div
            key={idx}
            className={`p-1 rounded font-medium transition-all ${
              step.done
                ? 'bg-amber-200/60 text-amber-900 border border-amber-300'
                : step.active
                ? 'bg-sky-200 text-sky-900 border border-sky-400 animate-pulse font-bold'
                : 'bg-white/80 text-slate-400 border border-amber-100'
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  );
};
