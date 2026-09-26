import React, { useState } from 'react';
import { CollisionRiskRecord, CollisionArbitrationResult, PathReservation, CorridorZone } from '../types.js';
import { ShieldAlert, Zap, AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, Clock, Radio, Compass, RefreshCw } from 'lucide-react';

interface CollisionManagementPanelProps {
  risks: CollisionRiskRecord[];
  arbitrations: CollisionArbitrationResult[];
  reservations: PathReservation[];
  corridors: CorridorZone[];
  onSimulateCollision?: () => void;
  onSelectRobot?: (robotId: string) => void;
  isLoading?: boolean;
}

export const CollisionManagementPanel: React.FC<CollisionManagementPanelProps> = ({
  risks,
  arbitrations,
  reservations,
  corridors,
  onSimulateCollision,
  onSelectRobot,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'arbitrations' | 'reservations' | 'corridors'>('arbitrations');

  return (
    <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 flex flex-col h-full shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-sky-100 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200/60">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Real-Time Collision Avoidance & Reservation</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-rose-50 border border-rose-200 text-rose-800 font-semibold">
                ACTIVE RADAR
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Kinematic trajectory crossing scans · Peer-to-peer path requests · Priority arbitration
            </p>
          </div>
        </div>

        {/* Action Triggers & Tabs */}
        <div className="flex items-center gap-2">
          {onSimulateCollision && (
            <button
              onClick={onSimulateCollision}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-rose-600 hover:bg-rose-500 text-white shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Trigger a live head-on collision scenario to demonstrate P2P path arbitration"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Simulate Collision</span>
            </button>
          )}

          <div className="flex items-center bg-sky-50/80 p-0.5 rounded-lg border border-sky-200/80 text-xs">
            <button
              onClick={() => setActiveTab('arbitrations')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'arbitrations' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Arbitration Log
            </button>
            <button
              onClick={() => setActiveTab('reservations')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'reservations' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Reservations ({reservations.length})
            </button>
            <button
              onClick={() => setActiveTab('corridors')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'corridors' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Narrow Corridors
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] pr-1 text-xs">
        {activeTab === 'arbitrations' ? (
          arbitrations.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              No collision events detected. Click "Simulate Collision" to trigger a demonstration.
            </div>
          ) : (
            arbitrations.map((arb, idx) => (
              <div
                key={arb.risk_id || idx}
                className="bg-rose-50/30 border border-rose-200/80 hover:border-rose-300 rounded-lg p-3 transition-colors shadow-2xs font-mono"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-rose-100 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-rose-800 font-bold text-xs uppercase bg-rose-100/80 border border-rose-300 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>⚠ COLLISION RISK</span>
                    </span>
                    <div className="flex items-center gap-1 text-slate-800 font-bold text-xs">
                      <button
                        onClick={() => onSelectRobot && onSelectRobot(arb.robot1_id)}
                        className="text-sky-700 hover:underline cursor-pointer"
                      >
                        {arb.robot1_id}
                      </button>
                      <span className="text-slate-400">and</span>
                      <button
                        onClick={() => onSelectRobot && onSelectRobot(arb.robot2_id)}
                        className="text-sky-700 hover:underline cursor-pointer"
                      >
                        {arb.robot2_id}
                      </button>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {new Date(arb.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Subtitle / Risk description */}
                <div className="text-[11px] text-rose-800 font-medium mb-2">
                  Potential collision detected ({arb.risk_type.replace('_', ' ')}) at intersection ({arb.intersection.x}, {arb.intersection.y}).
                </div>

                {/* Direct P2P Communication */}
                <div className="bg-white rounded-md p-2.5 border border-sky-100 mb-2.5 space-y-1 text-xs shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center justify-between">
                    <span>Direct Robot P2P Communication</span>
                    <span className="text-slate-400">Autonomous packet exchange</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-800 px-2 py-1 rounded bg-indigo-50 border border-indigo-100 font-semibold">
                    <span>{arb.robot1_id} → PATH_REQUEST</span>
                    <span className="text-[10px] text-slate-500 font-normal">Negotiating intersection</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-800 px-2 py-1 rounded bg-indigo-50 border border-indigo-100 font-semibold">
                    <span>{arb.robot2_id} → PATH_REQUEST</span>
                    <span className="text-[10px] text-slate-500 font-normal">Negotiating intersection</span>
                  </div>
                </div>

                {/* Priority Rule Evaluation Breakdown */}
                <div className="bg-slate-50 rounded-md p-2 border border-slate-200 mb-2.5 text-[11px] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">
                    Priority Rule Factors (Score = Task Prio + Sunk Distance + Battery + Proximity)
                  </span>
                  {arb.priority_factors.map(pf => (
                    <div key={pf.robot_id} className="flex items-center justify-between text-slate-700">
                      <span className="font-bold text-sky-700">{pf.robot_id}:</span>
                      <span className="text-slate-500">
                        Task Prio: {pf.task_priority_score} · Sunk Dist: {pf.distance_travelled_score} · Bat: {pf.battery_score} · Prox: {pf.intersection_proximity_score}
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums bg-white border border-slate-200 px-1 rounded">
                        Total: {pf.total_priority}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Arbitration Outcome */}
                <div className="bg-white rounded-md p-2.5 border border-sky-100 mb-2 space-y-1.5 text-xs shadow-2xs">
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                    <span>{arb.granted_robot} → MOVE (PATH_GRANTED)</span>
                    <span className="text-[10px] uppercase bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                      Access Granted
                    </span>
                  </div>

                  <div className="flex items-center justify-between px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                    <span>{arb.waiting_robot} → WAIT</span>
                    <span className="text-[10px] uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300 animate-pulse">
                      Holding Position
                    </span>
                  </div>

                  <div className="text-[11px] text-amber-900 pt-1 font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Path reserved by {arb.granted_robot}</span>
                  </div>
                </div>

                {/* Clearing & Release Sequence */}
                <div className="pt-2 border-t border-rose-100 text-[10px] text-slate-500 space-y-0.5">
                  <span className="text-slate-500 uppercase font-bold block text-[9px]">
                    Release Protocol on Zone Clear:
                  </span>
                  <div className="flex items-center gap-1 text-slate-700">
                    <span className="text-emerald-700 font-semibold">{arb.granted_robot} → PATH_RELEASE</span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-sky-700 font-semibold">{arb.waiting_robot} → PATH_GRANTED</span>
                    <span className="text-slate-400">➔</span>
                    <span className="text-emerald-700 font-semibold">{arb.waiting_robot} → MOVE</span>
                  </div>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'reservations' ? (
          reservations.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              No active path reservations. All conflict zones are currently clear.
            </div>
          ) : (
            <div className="space-y-2 font-mono text-xs">
              {reservations.map(res => (
                <div
                  key={res.id}
                  className="bg-white border border-amber-200 rounded-lg p-2.5 flex items-center justify-between shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-800 font-bold">{res.zone_name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300 font-semibold">
                        RESERVED
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-2">
                      <span>Reserved by: <strong className="text-emerald-700">{res.reserved_by}</strong></span>
                      <span>·</span>
                      <span>Waiting: <strong className="text-amber-700">{res.waiting_robot}</strong></span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">
                      Active for {Math.round((Date.now() - res.created_at) / 1000)}s
                    </span>
                    <span className="text-[10px] text-emerald-700 font-semibold">Release pending clear</span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2.5 font-mono text-xs">
            {corridors.map(c => (
              <div
                key={c.id}
                className="bg-white border border-sky-100 rounded-lg p-3 space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-sky-600" />
                    <span className="font-bold text-slate-900">{c.name}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    c.occupied_by ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {c.occupied_by ? `OCCUPIED by ${c.occupied_by}` : 'CLEAR / AVAILABLE'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Coordinates: ({c.x}, {c.y}) — 60 × 60 bottleneck</span>
                  <span>Waiting Queue: {c.waiting_queue.length} robots</span>
                </div>

                <p className="text-[10px] text-slate-500">
                  Autonomous mutual exclusion zone. If two robots approach simultaneously, priority arbitration grants entry to the highest priority unit, while the peer enters WAITING.
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
