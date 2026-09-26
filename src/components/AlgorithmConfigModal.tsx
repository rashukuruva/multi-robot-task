import React, { useState } from 'react';
import { NegotiationWeights } from '../types.js';
import { Sliders, Check, RotateCcw } from 'lucide-react';

interface AlgorithmConfigModalProps {
  weights: NegotiationWeights;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newWeights: NegotiationWeights) => void;
}

export const AlgorithmConfigModal: React.FC<AlgorithmConfigModalProps> = ({
  weights,
  isOpen,
  onClose,
  onSave,
}) => {
  const [localWeights, setLocalWeights] = useState<NegotiationWeights>({ ...weights });

  if (!isOpen) return null;

  const handleResetDefaults = () => {
    setLocalWeights({
      w_dist: 1.0,
      w_batt: 1.0,
      w_work: 0.8,
      w_prio: 1.2,
    });
  };

  const handleSave = () => {
    onSave(localWeights);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Negotiation Formula Tuning</h3>
              <p className="text-xs text-slate-400">Contract Net Protocol algorithmic weights</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer">
            ✕
          </button>
        </div>

        {/* Formula Display */}
        <div className="p-6 space-y-5">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
            <span className="text-slate-500 block mb-1 uppercase text-[10px] font-bold">Scoring Objective Function</span>
            <div className="text-sky-300 font-bold leading-relaxed">
              Bid Score = (Distance Cost × {localWeights.w_dist}) + (Battery Cost × {localWeights.w_batt}) + (Workload Cost × {localWeights.w_work}) − (Priority Benefit × {localWeights.w_prio})
            </div>
            <p className="text-[11px] text-slate-500 mt-2 font-sans">
              Autonomous robots evaluate eligible tasks. The robot with the lowest cost Bid Score wins the assignment contract.
            </p>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {/* 1. Distance Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-200">Distance Weight (w_dist)</span>
                <span className="font-mono text-sky-400 font-bold">{localWeights.w_dist}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={localWeights.w_dist}
                onChange={(e) => setLocalWeights({ ...localWeights, w_dist: Number(e.target.value) })}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Higher values prioritize nearby robots to minimize travel time.</span>
            </div>

            {/* 2. Battery Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-200">Battery Preservation Weight (w_batt)</span>
                <span className="font-mono text-emerald-400 font-bold">{localWeights.w_batt}</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.0"
                step="0.1"
                value={localWeights.w_batt}
                onChange={(e) => setLocalWeights({ ...localWeights, w_batt: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Higher values penalize low-battery robots, preventing field depletion.</span>
            </div>

            {/* 3. Workload Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-200">Workload Balancing Weight (w_work)</span>
                <span className="font-mono text-amber-400 font-bold">{localWeights.w_work}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.1"
                value={localWeights.w_work}
                onChange={(e) => setLocalWeights({ ...localWeights, w_work: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Prevents starvation by distributing tasks evenly across all 500 robots.</span>
            </div>

            {/* 4. Priority Weight */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-medium text-slate-200">Priority Urgency Benefit (w_prio)</span>
                <span className="font-mono text-purple-400 font-bold">{localWeights.w_prio}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={localWeights.w_prio}
                onChange={(e) => setLocalWeights({ ...localWeights, w_prio: Number(e.target.value) })}
                className="w-full accent-purple-500 cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">High and Critical tasks receive larger cost discounts to ensure immediate pickup.</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Weights</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
