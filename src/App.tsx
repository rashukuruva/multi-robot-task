import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Robot, 
  Task, 
  Statistics, 
  LiveStateResponse, 
  NegotiationWeights, 
  DeadlockState, 
  DeadlockRecord,
  P2PNegotiationSession,
  P2PMessage,
  TaskConflictRecord,
  ResourceConflictRecord,
  CollisionRiskRecord,
  CollisionArbitrationResult,
  PathReservation,
  CorridorZone
} from './types.js';
import { Header } from './components/Header.tsx';
import { StatCards } from './components/StatCards.tsx';
import { SimulationCanvas } from './components/SimulationCanvas.tsx';
import { RobotDetailPanel } from './components/RobotDetailPanel.tsx';
import { TaskDetailPanel } from './components/TaskDetailPanel.tsx';
import { NegotiationLogPanel } from './components/NegotiationLogPanel.tsx';
import { P2PNegotiationPanel } from './components/P2PNegotiationPanel.tsx';
import { ConflictManagementPanel } from './components/ConflictManagementPanel.tsx';
import { CollisionManagementPanel } from './components/CollisionManagementPanel.tsx';
import { AnalyticsSection } from './components/AnalyticsSection.tsx';
import { GroupExplorerModal } from './components/GroupExplorerModal.tsx';
import { AlgorithmConfigModal } from './components/AlgorithmConfigModal.tsx';
import { PythonProjectModal } from './components/PythonProjectModal.tsx';
import { DeadlockWarningBanner } from './components/DeadlockWarningBanner.tsx';
import { WaitForGraphPanel } from './components/WaitForGraphPanel.tsx';
import { DeadlockMetricsPanel } from './components/DeadlockMetricsPanel.tsx';
import { AlertTriangle, CheckCircle, RefreshCw, Radio, ShieldAlert, Zap, Layers } from 'lucide-react';

const defaultStats: Statistics = {
  total_robots: 500,
  total_tasks: 20,
  idle_robots: 500,
  busy_robots: 0,
  failed_robots: 0,
  completed_tasks: 0,
  pending_tasks: 20,
  assigned_tasks: 0,
  negotiations: 0,
  groups: [
    { group_id: 'Group A', total: 125, idle: 125, busy: 0, failed: 0 },
    { group_id: 'Group B', total: 125, idle: 125, busy: 0, failed: 0 },
    { group_id: 'Group C', total: 125, idle: 125, busy: 0, failed: 0 },
    { group_id: 'Group D', total: 125, idle: 125, busy: 0, failed: 0 },
  ],
  battery_distribution: {
    '80-100%': 250,
    '60-80%': 150,
    '40-60%': 100,
    '20-40%': 0,
    '0-20%': 0,
  },
  priority_distribution: [],
};

const defaultWeights: NegotiationWeights = {
  w_dist: 1.0,
  w_batt: 1.0,
  w_work: 0.8,
  w_prio: 1.2,
};

const defaultDeadlockState: DeadlockState = {
  metrics: {
    deadlocks_detected: 0,
    active_deadlocks: 0,
    recovered_deadlocks: 0,
    avg_recovery_time_sec: 0,
    robots_involved_count: 0,
    tasks_reallocated: 0,
  },
  activeDeadlocks: [],
  latestDeadlock: null,
  waitForGraph: {
    nodes: [],
    edges: [],
    hasCycle: false,
    cycle: [],
  },
  recoveryPolicy: 'lowest_priority',
};

export default function App() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [stats, setStats] = useState<Statistics>(defaultStats);
  const [activeRobots, setActiveRobots] = useState<Robot[]>([]);
  const [activeTasks, setActiveTasks] = useState<Task[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [weights, setWeights] = useState<NegotiationWeights>(defaultWeights);
  const [deadlockState, setDeadlockState] = useState<DeadlockState>(defaultDeadlockState);

  // Features 1, 2, 3 States
  const [p2pSessions, setP2pSessions] = useState<P2PNegotiationSession[]>([]);
  const [p2pMessages, setP2pMessages] = useState<P2PMessage[]>([]);
  const [taskConflicts, setTaskConflicts] = useState<TaskConflictRecord[]>([]);
  const [resourceConflicts, setResourceConflicts] = useState<ResourceConflictRecord[]>([]);
  const [activeReservations, setActiveReservations] = useState<PathReservation[]>([]);
  const [recentRisks, setRecentRisks] = useState<CollisionRiskRecord[]>([]);
  const [recentArbitrations, setRecentArbitrations] = useState<CollisionArbitrationResult[]>([]);
  const [corridors, setCorridors] = useState<CorridorZone[]>([]);
  const [activePanelTab, setActivePanelTab] = useState<'p2p' | 'conflicts' | 'collision' | 'logs'>('p2p');

  // Inspector states
  const [selectedRobot, setSelectedRobot] = useState<Robot | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Modals
  const [exploringGroup, setExploringGroup] = useState<string | null>(null);
  const [isWeightsOpen, setIsWeightsOpen] = useState<boolean>(false);
  const [isPythonOpen, setIsPythonOpen] = useState<boolean>(false);

  // Section 42 scroll anchor
  const deadlockSectionRef = useRef<HTMLDivElement>(null);

  // Failure banner toast
  const [failureBanner, setFailureBanner] = useState<{ message: string; subMessage?: string } | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Fetch live state from backend
  const fetchLiveState = useCallback(async () => {
    try {
      const res = await fetch('/api/live-state');
      if (!res.ok) return;
      const data: LiveStateResponse = await res.json();
      if (data.success) {
        setIsRunning(data.simulation.running);
        setSpeed(data.simulation.speed);
        setStats(data.statistics);
        setActiveRobots(data.activeRobots);
        setActiveTasks(data.activeTasks);
        setRecentLogs(data.recentLogs);
        setRecentEvents(data.recentEvents);
        if (data.weights) setWeights(data.weights);
        if (data.deadlock) setDeadlockState(data.deadlock);

        // Features 1, 2, 3 Data
        if (data.p2p) {
          setP2pSessions(data.p2p.sessions || []);
          setP2pMessages(data.p2p.messages || []);
        }
        if (data.conflicts) {
          setTaskConflicts(data.conflicts.taskConflicts || []);
          setResourceConflicts(data.conflicts.resourceConflicts || []);
        }
        if (data.collision) {
          setActiveReservations(data.collision.activeReservations || []);
          setRecentRisks(data.collision.recentRisks || []);
          setRecentArbitrations(data.collision.recentArbitrations || []);
          setCorridors(data.collision.corridors || []);
        }

        // Update selected robot telemetry if currently inspected
        if (selectedRobot) {
          const updated = data.activeRobots.find(r => r.id === selectedRobot.id);
          if (updated) setSelectedRobot(updated);
        }
        // Update selected task if currently inspected
        if (selectedTask) {
          const updated = data.activeTasks.find(t => t.id === selectedTask.id);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error('Failed to fetch live state:', err);
    }
  }, [selectedRobot, selectedTask]);

  // Handler for Feature 1: Trigger Decentralized P2P Task Auction
  const handleTriggerP2P = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/p2p/negotiate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActivePanelTab('p2p');
        await fetchLiveState();
      }
    } catch (e) {
      console.error('Failed to trigger P2P auction:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Feature 2: Simulate Task Conflict
  const handleSimulateTaskConflict = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/conflicts/simulate-task', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActivePanelTab('conflicts');
        await fetchLiveState();
      }
    } catch (e) {
      console.error('Failed to simulate task conflict:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Feature 2: Simulate Resource / Narrow Path Conflict
  const handleSimulateResourceConflict = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/conflicts/simulate-resource', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActivePanelTab('conflicts');
        await fetchLiveState();
      }
    } catch (e) {
      console.error('Failed to simulate resource conflict:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Feature 3: Simulate Collision Scenario
  const handleSimulateCollision = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/collision/simulate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setActivePanelTab('collision');
        await fetchLiveState();
      }
    } catch (e) {
      console.error('Failed to simulate collision scenario:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Handlers for Deadlock Simulation & Recovery (Section 36, 39, 40)
  const handleSimulateDeadlock = async (type: 'circular_waiting' | 'robot_blocking' | 'resource_deadlock' = 'circular_waiting') => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/deadlock/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (data.success && data.deadlock) {
        // Fetch fresh state immediately so UI updates instantly
        await fetchLiveState();
        // Scroll into view if needed
        deadlockSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      console.error('Failed to simulate deadlock:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecoverDeadlock = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/deadlock/recover/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchLiveState();
      }
    } catch (e) {
      console.error('Failed to recover deadlock:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangeRecoveryPolicy = async (policy: string) => {
    try {
      const res = await fetch('/api/deadlock/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy }),
      });
      const data = await res.json();
      if (data.success) {
        setDeadlockState(prev => ({ ...prev, recoveryPolicy: data.policy }));
      }
    } catch (e) {
      console.error('Failed to set recovery policy:', e);
    }
  };

  // Compute Section 33 Deadlock status
  const currentDeadlockStatus = (): 'NORMAL' | 'WAITING' | 'BLOCKED' | 'DEADLOCK_DETECTED' | 'RECOVERING' | 'RECOVERED' => {
    if (deadlockState.latestDeadlock) {
      if (deadlockState.latestDeadlock.status === 'RECOVERING') return 'RECOVERING';
      if (deadlockState.latestDeadlock.status === 'DETECTED') return 'DEADLOCK_DETECTED';
    }
    if (activeRobots.some(r => r.status === 'blocked')) return 'BLOCKED';
    if (activeRobots.some(r => (r.status as any) === 'waiting')) return 'WAITING';
    if (deadlockState.latestDeadlock?.status === 'RECOVERED') {
      const diff = (Date.now() - new Date(deadlockState.latestDeadlock.recovered_at || deadlockState.latestDeadlock.detected_at).getTime()) / 1000;
      if (diff < 15) return 'RECOVERED';
    }
    return 'NORMAL';
  };

  // Polling loop
  useEffect(() => {
    fetchLiveState();
    const intervalTime = isRunning ? 400 : 900;
    const timer = setInterval(fetchLiveState, intervalTime);
    return () => clearInterval(timer);
  }, [fetchLiveState, isRunning]);

  // Actions
  const handleStart = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/simulation/start', { method: 'POST' });
      setIsRunning(true);
      fetchLiveState();
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/simulation/pause', { method: 'POST' });
      setIsRunning(false);
      fetchLiveState();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/simulation/reset', { method: 'POST' });
      setIsRunning(false);
      setSelectedRobot(null);
      setSelectedTask(null);
      setFailureBanner(null);
      await fetchLiveState();
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateTasks = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/tasks/generate', { method: 'POST' });
      setSelectedRobot(null);
      setSelectedTask(null);
      await fetchLiveState();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMoreTasks = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/tasks/add-more', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 20 }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchLiveState();
      }
    } catch (e) {
      console.error('Failed to add more tasks:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignTasks = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/negotiation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchSize: 5 }),
      });
      await fetchLiveState();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateFailure = async (robotId?: string) => {
    setActionLoading(true);
    try {
      const endpoint = robotId ? `/api/robot/${robotId}/fail` : '/api/robot/fail-random';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (data.success && data.report) {
        const { failed_robot, interrupted_task, reallocation } = data.report;
        let subMsg = '';
        if (interrupted_task && reallocation) {
          subMsg = `Task ${interrupted_task.id} returned to negotiation and reallocated to ${reallocation.winner_id} (Winning replacement bid: ${reallocation.winner_score})!`;
        } else {
          subMsg = `Robot isolated. Task queue remaining intact.`;
        }

        setFailureBanner({
          message: `Robot ${failed_robot.id} encountered hardware fault and marked FAILED!`,
          subMessage: subMsg,
        });

        // Auto dismiss banner after 8s
        setTimeout(() => setFailureBanner(null), 8000);
      }
      await fetchLiveState();
    } finally {
      setActionLoading(false);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed);
    await fetch('/api/simulation/speed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speed: newSpeed }),
    });
  };

  const handleSaveWeights = async (newWeights: NegotiationWeights) => {
    setWeights(newWeights);
    await fetch('/api/negotiation/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newWeights),
    });
  };

  // Inspect task from robot or log
  const handleFocusTask = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (data.success && data.task) {
        setSelectedTask(data.task);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Inspect robot from task or log
  const handleFocusRobot = async (robotId: string) => {
    try {
      const res = await fetch(`/api/robots/${robotId}`);
      const data = await res.json();
      if (data.success && data.robot) {
        setSelectedRobot(data.robot);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col font-sans selection:bg-sky-200 selection:text-sky-900">
      {/* Header */}
      <Header
        isRunning={isRunning}
        speed={speed}
        onStart={handleStart}
        onPause={handlePause}
        onReset={handleReset}
        onGenerateTasks={handleGenerateTasks}
        onAddMoreTasks={handleAddMoreTasks}
        onAssignTasks={handleAssignTasks}
        onSimulateFailure={() => handleSimulateFailure()}
        onSimulateDeadlock={() => handleSimulateDeadlock('circular_waiting')}
        onTriggerP2P={handleTriggerP2P}
        onSimulateTaskConflict={handleSimulateTaskConflict}
        onSimulateCollision={handleSimulateCollision}
        onSpeedChange={handleSpeedChange}
        onOpenWeights={() => setIsWeightsOpen(true)}
        onOpenPythonProject={() => setIsPythonOpen(true)}
        isActionLoading={actionLoading}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex-1 w-full space-y-4">
        {/* Section 34: Deadlock Warning Banner */}
        <DeadlockWarningBanner
          deadlock={deadlockState.latestDeadlock}
          onRecover={handleRecoverDeadlock}
          onFocusRobot={handleFocusRobot}
          isActionLoading={actionLoading}
        />

        {/* Hardware Failure / Recovery Toast Banner */}
        {failureBanner && (
          <div className="bg-rose-50/95 border border-rose-300 rounded-xl p-4 flex items-start justify-between shadow-sm animate-in slide-in-from-top-3 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-rose-100 text-rose-700 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-rose-950 uppercase tracking-wide">
                  Autonomous Fault Recovery In Action
                </h4>
                <p className="text-xs text-rose-800 font-mono mt-0.5">{failureBanner.message}</p>
                {failureBanner.subMessage && (
                  <p className="text-xs text-rose-700 font-semibold mt-1 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{failureBanner.subMessage}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setFailureBanner(null)}
              className="text-rose-600 hover:text-rose-900 font-semibold text-xs px-2 py-1 rounded cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Real-Time Statistics Cards & Section 33 Deadlock Status */}
        <StatCards
          stats={stats}
          deadlockMetrics={deadlockState.metrics}
          deadlockStatus={currentDeadlockStatus()}
          onScrollToDeadlocks={() => deadlockSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
          onFilterStatus={(status) => {
            // Open Group modal or focus
            setExploringGroup('Group A');
          }}
        />

        {/* 2D Simulation Workspace & Right Inspector Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Main 2D Simulation Canvas & Live Decentralized Streams (8 columns) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <SimulationCanvas
              robots={activeRobots}
              tasks={activeTasks}
              groupStats={stats.groups}
              selectedRobot={selectedRobot}
              selectedTask={selectedTask}
              deadlockState={deadlockState}
              corridors={corridors}
              reservations={activeReservations}
              latestArbitration={recentArbitrations[0] || null}
              latestP2PSession={p2pSessions[0] || null}
              onSelectRobot={setSelectedRobot}
              onSelectTask={setSelectedTask}
              onSelectGroup={(groupId) => setExploringGroup(groupId)}
            />

            {/* Core Features 1, 2, 3 Navigation Tabs */}
            <div className="bg-white/95 backdrop-blur-md border border-sky-200 rounded-xl p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActivePanelTab('p2p')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePanelTab === 'p2p'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>1. P2P Negotiation</span>
                  {p2pSessions.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-mono font-bold">
                      {p2pSessions.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActivePanelTab('conflicts')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePanelTab === 'conflicts'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>2. Conflict Management</span>
                  {(taskConflicts.length > 0 || resourceConflicts.length > 0) && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-mono font-bold">
                      {taskConflicts.length + resourceConflicts.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActivePanelTab('collision')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePanelTab === 'collision'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>3. Collision Avoidance</span>
                  {activeReservations.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-mono font-bold animate-pulse">
                      {activeReservations.length} Active
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActivePanelTab('logs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    activePanelTab === 'logs'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-sky-50'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Central Audit Log</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pr-2 text-[11px] text-slate-600 font-mono hidden sm:flex">
                <span>Robots: {stats.total_robots}</span>
                <span>·</span>
                <span>Tasks: {stats.total_tasks}</span>
                <button
                  onClick={handleAddMoreTasks}
                  disabled={actionLoading}
                  className="ml-2 px-2.5 py-1 rounded bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-700 font-bold text-[10px] cursor-pointer transition-all active:scale-95 shadow-2xs"
                  title="Add 20 more tasks if desired"
                >
                  +20 More Tasks
                </button>
              </div>
            </div>

            {/* Active Feature Live Stream Panel */}
            {activePanelTab === 'p2p' && (
              <P2PNegotiationPanel
                sessions={p2pSessions}
                messages={p2pMessages}
                onTriggerP2P={handleTriggerP2P}
                onSelectTask={handleFocusTask}
                onSelectRobot={handleFocusRobot}
                isLoading={actionLoading}
              />
            )}

            {activePanelTab === 'conflicts' && (
              <ConflictManagementPanel
                taskConflicts={taskConflicts}
                resourceConflicts={resourceConflicts}
                onSimulateTaskConflict={handleSimulateTaskConflict}
                onSimulateResourceConflict={handleSimulateResourceConflict}
                onSelectTask={handleFocusTask}
                onSelectRobot={handleFocusRobot}
                isLoading={actionLoading}
              />
            )}

            {activePanelTab === 'collision' && (
              <CollisionManagementPanel
                risks={recentRisks}
                arbitrations={recentArbitrations}
                reservations={activeReservations}
                corridors={corridors}
                onSimulateCollision={handleSimulateCollision}
                onSelectRobot={handleFocusRobot}
                isLoading={actionLoading}
              />
            )}

            {activePanelTab === 'logs' && (
              <NegotiationLogPanel
                logs={recentLogs}
                events={recentEvents}
                onSelectTask={handleFocusTask}
                onSelectRobot={handleFocusRobot}
              />
            )}
          </div>

          {/* Side Inspector Panels (4 columns) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Robot Details Inspector */}
            <RobotDetailPanel
              robot={selectedRobot}
              onFailRobot={(id) => handleSimulateFailure(id)}
              onFocusTask={handleFocusTask}
              onClose={() => setSelectedRobot(null)}
            />

            {/* Task Details Inspector */}
            <TaskDetailPanel
              task={selectedTask}
              onFocusRobot={handleFocusRobot}
              onClose={() => setSelectedTask(null)}
            />

            {/* Contract Net Protocol Quick Explainer Card */}
            <div className="bg-white/95 backdrop-blur-md border border-sky-200 rounded-xl p-4 text-xs text-slate-600 space-y-2 shadow-xs">
              <h4 className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">
                How Negotiation Works (Contract Net)
              </h4>
              <p>
                1. Tasks announce required workload to eligible idle robots with battery ≥ 15%.
              </p>
              <p>
                2. Robots compute cost bids based on proximity, battery health, and workload balance:
              </p>
              <div className="font-mono text-[10px] text-sky-900 bg-sky-50/80 p-2 rounded border border-sky-200">
                Bid = Dist·{weights.w_dist} + Batt·{weights.w_batt} + Work·{weights.w_work} − Prio·{weights.w_prio}
              </div>
              <p>
                3. The lowest valid bid wins. If any robot fails en route, the task is immediately returned to auction!
              </p>
            </div>
          </div>
        </div>

        {/* Section 42 & 38: Live Wait-For Graph & Deadlock Recovery Analytics */}
        <div ref={deadlockSectionRef} className="space-y-4 pt-2">
          <WaitForGraphPanel
            graph={deadlockState.waitForGraph}
            activeDeadlock={deadlockState.latestDeadlock}
            metrics={deadlockState.metrics}
            recoveryPolicy={deadlockState.recoveryPolicy}
            onSimulateDeadlock={handleSimulateDeadlock}
            onRecover={handleRecoverDeadlock}
            onChangePolicy={handleChangeRecoveryPolicy}
            onSelectRobot={handleFocusRobot}
            isActionLoading={actionLoading}
          />

          <DeadlockMetricsPanel
            metrics={deadlockState.metrics}
            onFocusRobot={handleFocusRobot}
          />
        </div>

        {/* Analytics & Fleet Grouping Overview */}
        <AnalyticsSection
          stats={stats}
          onSelectGroup={(groupId) => setExploringGroup(groupId)}
        />
      </main>

      {/* Modals */}
      <GroupExplorerModal
        groupId={exploringGroup}
        onClose={() => setExploringGroup(null)}
        onSelectRobot={(robot) => {
          setSelectedRobot(robot);
        }}
      />

      <AlgorithmConfigModal
        weights={weights}
        isOpen={isWeightsOpen}
        onClose={() => setIsWeightsOpen(false)}
        onSave={handleSaveWeights}
      />

      <PythonProjectModal
        isOpen={isPythonOpen}
        onClose={() => setIsPythonOpen(false)}
      />
    </div>
  );
}
