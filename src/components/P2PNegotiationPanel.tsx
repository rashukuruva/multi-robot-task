import React, { useState } from 'react';
import { P2PNegotiationSession, P2PMessage } from '../types.js';
import { Zap, Award, CheckCircle, Radio, Clock, Shield, ArrowRight, MessageSquare, Battery, Compass } from 'lucide-react';

interface P2PNegotiationPanelProps {
  sessions: P2PNegotiationSession[];
  messages: P2PMessage[];
  onTriggerP2P?: () => void;
  onSelectTask?: (taskId: string) => void;
  onSelectRobot?: (robotId: string) => void;
  isLoading?: boolean;
}

export const P2PNegotiationPanel: React.FC<P2PNegotiationPanelProps> = ({
  sessions,
  messages,
  onTriggerP2P,
  onSelectTask,
  onSelectRobot,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'sessions' | 'messages'>('sessions');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredMessages = filterType === 'all'
    ? messages
    : messages.filter(m => m.message_type === filterType);

  return (
    <div className="bg-white/95 backdrop-blur-md border border-sky-200/90 rounded-xl p-4 flex flex-col h-full shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-sky-100 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-200/60">
            <Radio className="w-4 h-4 animate-pulse" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>Peer-to-Peer Task Negotiation</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold">
                DECENTRALIZED
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Nearby robots calculate 5-factor bids & exchange autonomous CNP packets
            </p>
          </div>
        </div>

        {/* Action Controls & Tab switcher */}
        <div className="flex items-center gap-2">
          {onTriggerP2P && (
            <button
              onClick={onTriggerP2P}
              disabled={isLoading}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Trigger P2P Negotiation on pending task"
            >
              <Zap className="w-3 h-3 fill-current" />
              <span>Auction Task</span>
            </button>
          )}

          <div className="flex items-center bg-sky-50/80 p-0.5 rounded-lg border border-sky-200/80 text-xs">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'sessions' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Auctions
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                activeTab === 'messages' ? 'bg-white text-slate-900 font-semibold shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              P2P Packets
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[380px] pr-1 text-xs">
        {activeTab === 'sessions' ? (
          sessions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 italic">
              No P2P negotiation sessions yet. Click "Auction Task" or "Start Simulation".
            </div>
          ) : (
            sessions.map((sess, idx) => (
              <div
                key={sess.task_id + '-' + idx}
                className="bg-sky-50/30 border border-sky-200/80 hover:border-sky-300 rounded-lg p-3 transition-colors shadow-2xs"
              >
                {/* Task Header & Priority */}
                <div className="flex items-center justify-between pb-2 border-b border-sky-100 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sky-800 font-mono font-bold text-sm">
                      Task {sess.task_id}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                      sess.task_priority === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      sess.task_priority === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      sess.task_priority === 'Medium' ? 'bg-yellow-50 text-yellow-800 border-yellow-200' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {sess.task_priority} Priority
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(sess.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Candidate Bids as specified in prompt:
                    R-101 → Bid: 24.5
                    R-204 → Bid: 18.2
                    R-315 → Bid: 27.1
                */}
                <div className="bg-white rounded-md p-2 border border-sky-100 mb-2.5 font-mono shadow-2xs">
                  <div className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                    <span>Nearby Robot Bids</span>
                    <span className="text-[9px] text-slate-400 lowercase">dist · bat · work · est. time</span>
                  </div>
                  <div className="space-y-1.5">
                    {sess.bids.map(b => {
                      const isWinner = b.robot_id === sess.winner_id;
                      return (
                        <div
                          key={b.robot_id}
                          className={`flex items-center justify-between text-xs px-2 py-1 rounded transition-colors ${
                            isWinner
                              ? 'bg-purple-50 text-purple-900 border border-purple-200 font-semibold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onSelectRobot && onSelectRobot(b.robot_id)}
                              className="text-sky-600 font-bold hover:underline cursor-pointer"
                            >
                              {b.robot_id}
                            </button>
                            <span className="text-slate-400">→</span>
                            <span className="text-slate-900 font-bold">Bid: {b.bid_score.toFixed(1)}</span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span>{b.distance}u</span>
                            <span>·</span>
                            <span>{b.battery}%</span>
                            <span>·</span>
                            <span>{b.workload} tasks</span>
                            <span>·</span>
                            <span>{b.est_completion_time_sec}s</span>
                            {isWinner && (
                              <span className="ml-1 text-[9px] uppercase px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                                Winner
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Winner Callout banner */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded bg-purple-50 border border-purple-200 text-xs">
                  <div className="flex items-center gap-1.5 text-purple-900 font-medium">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Winner:</span>
                    <button
                      onClick={() => onSelectRobot && onSelectRobot(sess.winner_id)}
                      className="font-mono font-bold text-sky-700 hover:underline cursor-pointer"
                    >
                      {sess.winner_id}
                    </button>
                  </div>
                  <span className="font-mono text-xs text-purple-800 font-bold">
                    Winning Bid: {sess.winner_bid.toFixed(1)}
                  </span>
                </div>

                {/* Packet timeline breadcrumb */}
                <div className="mt-2 pt-2 border-t border-sky-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1 text-[9px]">
                    <span className="text-indigo-600 font-semibold">TASK_REQUEST</span>
                    <span>→</span>
                    <span className="text-amber-600 font-semibold">TASK_BID ({sess.bids.length})</span>
                    <span>→</span>
                    <span className="text-emerald-600 font-semibold">TASK_ACCEPT ({sess.winner_id})</span>
                    <span>→</span>
                    <span className="text-slate-400">TASK_REJECT ({sess.bids.length - 1})</span>
                  </div>
                  <span className="text-slate-400">Peers: {sess.candidate_robots.join(', ')}</span>
                </div>
              </div>
            ))
          )
        ) : (
          <div>
            {/* Packet Type Filter Tabs */}
            <div className="flex flex-wrap gap-1 mb-2">
              {['all', 'TASK_REQUEST', 'TASK_BID', 'TASK_ACCEPT', 'TASK_REJECT', 'TASK_COMPLETED'].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer transition-colors ${
                    filterType === t
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic">No packet logs matching filter.</div>
            ) : (
              <div className="space-y-1.5 font-mono text-xs">
                {filteredMessages.map((msg, idx) => {
                  let badgeColor = 'text-slate-600 bg-slate-100 border border-slate-200';
                  if (msg.message_type === 'TASK_REQUEST') badgeColor = 'text-indigo-700 bg-indigo-50 border border-indigo-200';
                  else if (msg.message_type === 'TASK_BID') badgeColor = 'text-amber-700 bg-amber-50 border border-amber-200';
                  else if (msg.message_type === 'TASK_ACCEPT') badgeColor = 'text-emerald-700 bg-emerald-50 border border-emerald-200';
                  else if (msg.message_type === 'TASK_REJECT') badgeColor = 'text-slate-600 bg-slate-100 border border-slate-200';
                  else if (msg.message_type === 'TASK_COMPLETED') badgeColor = 'text-sky-700 bg-sky-50 border border-sky-200';

                  return (
                    <div
                      key={msg.id || idx}
                      className="bg-white border border-sky-100 rounded p-2 flex items-start justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeColor}`}>
                            {msg.message_type}
                          </span>
                          <span className="text-slate-600 text-[11px]">
                            {msg.sender_id} ➔ {msg.receiver_id}
                          </span>
                          {msg.task_id && (
                            <span className="text-sky-700 font-bold text-[11px]">
                              [{msg.task_id}]
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600 pl-1">
                          {typeof msg.payload === 'object'
                            ? JSON.stringify(msg.payload)
                            : msg.payload}
                        </div>
                      </div>
                      <span className="text-[9px] text-slate-400 shrink-0">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
