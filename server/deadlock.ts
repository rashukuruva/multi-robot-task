import { SimulationDatabase, RobotRecord, TaskRecord, DeadlockRecord, RobotDependencyRecord } from './database.js';
import { NegotiationEngine } from './negotiation.js';

export interface WaitForEdge {
  from: string; // robot_id waiting
  to: string;   // robot_id waiting for
  resource: string; // e.g. "path_collision", "task_lock:T-012"
  taskId?: string | null;
}

export interface WaitForGraphData {
  nodes: { id: string; status: string; task: string | null }[];
  edges: WaitForEdge[];
  hasCycle: boolean;
  cycle: string[]; // sequence of robot IDs forming the cycle e.g. ["R-101", "R-202", "R-305"]
}

export type RecoveryPolicy = 'lowest_priority' | 'lowest_battery' | 'least_task_progress' | 'shortest_alternative_route';

export interface DeadlockSimulationParams {
  type?: 'circular_waiting' | 'robot_blocking' | 'resource_deadlock';
  robotCount?: number; // 3 to 5
}

export class DeadlockEngine {
  private db: SimulationDatabase;
  private negotiationEngine: NegotiationEngine;
  private recoveryPolicy: RecoveryPolicy = 'lowest_priority';
  private deadlockCounter: number = 1;
  private recoveryTimer: NodeJS.Timeout | null = null;

  constructor(db: SimulationDatabase, negotiationEngine: NegotiationEngine) {
    this.db = db;
    this.negotiationEngine = negotiationEngine;

    // Check existing count of deadlocks in database to maintain ID sequence
    const existing = this.db.getDeadlocks('all', 100);
    this.deadlockCounter = existing.length + 1;
  }

  public getRecoveryPolicy(): RecoveryPolicy {
    return this.recoveryPolicy;
  }

  public setRecoveryPolicy(policy: RecoveryPolicy) {
    this.recoveryPolicy = policy;
  }

  /**
   * Build the live wait-for graph from active dependencies in database
   * and detect cycles using DFS cycle detection.
   */
  public getWaitForGraph(): WaitForGraphData {
    const dependencies = this.db.getActiveDependencies();
    const edges: WaitForEdge[] = dependencies.map(d => ({
      from: d.robot_id,
      to: d.waiting_for_robot,
      resource: d.resource,
      taskId: d.task_id,
    }));

    // Collect all involved nodes
    const nodeIds = new Set<string>();
    edges.forEach(e => {
      nodeIds.add(e.from);
      nodeIds.add(e.to);
    });

    const nodes = Array.from(nodeIds).map(id => {
      const robot = this.db.getRobotById(id);
      return {
        id,
        status: robot ? robot.status : 'unknown',
        task: robot ? robot.current_task : null,
      };
    });

    // Detect cycle using DFS
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
      adjacency.get(edge.from)!.push(edge.to);
    }

    const { hasCycle, cycle } = this.detectCycle(adjacency);

    return {
      nodes,
      edges,
      hasCycle,
      cycle,
    };
  }

  /**
   * DFS-based cycle detection returning the cycle path if found
   */
  private detectCycle(adjacency: Map<string, string[]>): { hasCycle: boolean; cycle: string[] } {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const parentMap = new Map<string, string>();
    let cycleNodes: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          parentMap.set(neighbor, node);
          if (dfs(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          // Cycle found! Reconstruct cycle from node back to neighbor
          const path = [neighbor];
          let curr = node;
          while (curr && curr !== neighbor) {
            path.push(curr);
            curr = parentMap.get(curr) || '';
          }
          path.push(neighbor);
          path.reverse();
          cycleNodes = path;
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of adjacency.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return { hasCycle: true, cycle: cycleNodes };
        }
      }
    }

    return { hasCycle: false, cycle: [] };
  }

  /**
   * Periodic check called by SimulationManager to verify system state,
   * detect route proximity blockages, build wait-for relationships, and trigger detection.
   */
  public checkAndDetectDeadlocks(): DeadlockRecord | null {
    // 1. Run cycle detection on existing wait-for dependencies
    const graph = this.getWaitForGraph();

    if (graph.hasCycle && graph.cycle.length >= 2) {
      // Check if this cycle is already registered as an active deadlock
      const activeDeadlocks = this.db.getDeadlocks('DETECTED').concat(this.db.getDeadlocks('RECOVERING'));
      const cycleSet = new Set(graph.cycle);

      const alreadyTracked = activeDeadlocks.some(d => {
        try {
          const inv = JSON.parse(d.robots_involved);
          return Array.isArray(inv) && inv.some(r => cycleSet.has(r));
        } catch {
          return false;
        }
      });

      if (!alreadyTracked) {
        // Formally register DEADLOCK_DETECTED!
        const deadlockId = `D-${String(this.deadlockCounter++).padStart(3, '0')}`;
        const uniqueRobotsInCycle = Array.from(new Set(graph.cycle));
        const cause = 'Circular waiting on intersecting routing corridors and task reservations';

        const record: DeadlockRecord = {
          id: deadlockId,
          status: 'DETECTED',
          cause,
          robots_involved: JSON.stringify(uniqueRobotsInCycle),
          detected_at: new Date().toISOString(),
          recovery_started_at: null,
          recovered_at: null,
          recovery_robot: null,
          recovery_action: null,
        };

        this.db.addDeadlock(record);

        // Update robot statuses to 'blocked'
        for (const rId of uniqueRobotsInCycle) {
          this.db.updateRobot(rId, { status: 'blocked' });
        }

        this.db.addEvent(
          'deadlock_detected',
          null,
          null,
          `⚠️ DEADLOCK DETECTED [${deadlockId}]: Cycle (${graph.cycle.join(' → ')}). All involved robots set to BLOCKED state.`
        );

        // Schedule automated recovery workflow after brief visual detection delay (1.5s)
        setTimeout(() => {
          this.executeRecovery(deadlockId);
        }, 1500);

        return record;
      }
    }

    return null;
  }

  /**
   * Intentionally simulate a controlled deadlock (Section 39)
   * Supports: circular_waiting, robot_blocking, resource_deadlock
   */
  public simulateDeadlock(params?: DeadlockSimulationParams): DeadlockRecord {
    // Pick 3 candidate moving or active robots
    const activeRobots = this.db.getRobots({ status: 'moving' });
    let selectedRobots: RobotRecord[] = [];

    if (activeRobots.length >= 3) {
      selectedRobots = activeRobots.slice(0, 3);
    } else {
      // If not enough moving robots, pick idle robots and assign them conflicting tasks
      const idleRobots = this.db.getRobots({ status: 'idle' }).filter(r => r.failed === 0);
      const pendingTasks = this.db.getTasks({ status: 'pending' });

      selectedRobots = idleRobots.slice(0, 3);
      // Give them positions facing each other in central corridor (around 450, 300)
      const positions = [
        { x: 410, y: 300, tx: 490, ty: 300 }, // R1 moving East
        { x: 490, y: 300, tx: 450, ty: 340 }, // R2 moving South-West
        { x: 450, y: 340, tx: 410, ty: 300 }, // R3 moving North-West
      ];

      for (let i = 0; i < selectedRobots.length; i++) {
        const r = selectedRobots[i];
        const p = positions[i];
        const t = pendingTasks[i];
        const taskId = t ? t.id : `T-D${i + 1}`;

        if (t) {
          this.db.updateTask(t.id, {
            status: 'in_progress',
            assigned_robot: r.id,
            x: p.tx,
            y: p.ty,
          });
        }

        this.db.updateRobot(r.id, {
          x: p.x,
          y: p.y,
          target_x: p.tx,
          target_y: p.ty,
          status: 'blocked',
          current_task: taskId,
        });
      }
    }

    const r1 = selectedRobots[0];
    const r2 = selectedRobots[1];
    const r3 = selectedRobots[2];

    const type = params?.type || 'circular_waiting';
    let causeText = 'Circular waiting';
    if (type === 'robot_blocking') {
      causeText = 'Robot-to-Robot bidirectional blocking on central transit corridor';
    } else if (type === 'resource_deadlock') {
      causeText = 'Cross-dependency lock on conflicting task delivery zones';
    } else {
      causeText = 'Circular waiting cycle: R-A waiting on R-B waiting on R-C';
    }

    // Set their statuses to 'waiting' / 'blocked'
    this.db.updateRobot(r1.id, { status: 'blocked' });
    this.db.updateRobot(r2.id, { status: 'blocked' });
    this.db.updateRobot(r3.id, { status: 'blocked' });

    // Clear old dependencies and add circular wait-for edges: R1 -> R2 -> R3 -> R1
    this.db.clearActiveDependencies();

    const now = new Date().toISOString();
    this.db.addDependency({
      robot_id: r1.id,
      waiting_for_robot: r2.id,
      task_id: r1.current_task,
      resource: 'transit_route_corridor_A',
      status: 'active',
      timestamp: now,
    });
    this.db.addDependency({
      robot_id: r2.id,
      waiting_for_robot: r3.id,
      task_id: r2.current_task,
      resource: 'cross_intersection_zone_B',
      status: 'active',
      timestamp: now,
    });
    this.db.addDependency({
      robot_id: r3.id,
      waiting_for_robot: r1.id,
      task_id: r3.current_task,
      resource: 'loading_dock_buffer_C',
      status: 'active',
      timestamp: now,
    });

    // Create Deadlock Record
    const deadlockId = `D-${String(this.deadlockCounter++).padStart(3, '0')}`;
    const robotsInvolved = [r1.id, r2.id, r3.id];

    const record: DeadlockRecord = {
      id: deadlockId,
      status: 'DETECTED',
      cause: causeText,
      robots_involved: JSON.stringify(robotsInvolved),
      detected_at: now,
      recovery_started_at: null,
      recovered_at: null,
      recovery_robot: null,
      recovery_action: null,
    };

    this.db.addDeadlock(record);

    this.db.addEvent(
      'deadlock_simulated',
      r1.id,
      r1.current_task,
      `⚠️ DEADLOCK SIMULATED [${deadlockId}]: ${r1.id} → ${r2.id} → ${r3.id} → ${r1.id}. System entered DEADLOCK_DETECTED state.`
    );

    // Automatically trigger recovery sequence after 2.5 seconds so user can see deadlock clearly
    if (this.recoveryTimer) clearTimeout(this.recoveryTimer);
    this.recoveryTimer = setTimeout(() => {
      this.executeRecovery(deadlockId);
    }, 2800);

    return record;
  }

  /**
   * Execute 6-Step Deadlock Recovery Algorithm (Section 36 & 37)
   */
  public executeRecovery(deadlockId: string): DeadlockRecord | null {
    const deadlock = this.db.getDeadlockById(deadlockId);
    if (!deadlock || deadlock.status === 'RECOVERED') return null;

    let involvedIds: string[] = [];
    try {
      involvedIds = JSON.parse(deadlock.robots_involved);
    } catch {
      involvedIds = [];
    }

    if (involvedIds.length === 0) return null;

    // Step 1: Update status to RECOVERING
    const recoveryStartTime = new Date().toISOString();
    this.db.updateDeadlock(deadlockId, {
      status: 'RECOVERING',
      recovery_started_at: recoveryStartTime,
    });

    this.db.addEvent(
      'deadlock_recovery_started',
      null,
      null,
      `🔄 DEADLOCK RECOVERY STARTED [${deadlockId}]: Identifying optimal yield candidate using policy '${this.recoveryPolicy}'...`
    );

    // Step 2: Select a recovery robot based on configurable policy
    const involvedRobots = involvedIds.map(id => this.db.getRobotById(id)).filter(Boolean) as RobotRecord[];
    if (involvedRobots.length === 0) return null;

    let recoveryRobot = involvedRobots[0];

    switch (this.recoveryPolicy) {
      case 'lowest_battery':
        involvedRobots.sort((a, b) => a.battery - b.battery);
        recoveryRobot = involvedRobots[0];
        break;

      case 'least_task_progress':
      case 'lowest_priority':
      default:
        // Pick robot with least tasks completed, or lower battery
        involvedRobots.sort((a, b) => (a.tasks_completed - b.tasks_completed) || (a.battery - b.battery));
        recoveryRobot = involvedRobots[0];
        break;
    }

    const releasedTask = recoveryRobot.current_task;

    this.db.addEvent(
      'deadlock_robot_selected',
      recoveryRobot.id,
      releasedTask,
      `👉 Robot ${recoveryRobot.id} selected for rerouting and task release based on '${this.recoveryPolicy}'.`
    );

    // Step 3: Release reservations & dependencies for the selected robot
    this.db.clearDependenciesForRobot(recoveryRobot.id);
    this.db.addEvent(
      'deadlock_resource_released',
      recoveryRobot.id,
      releasedTask,
      `🔓 Route reservation and mutex lock held by ${recoveryRobot.id} released.`
    );

    // Step 4: Recalculate route - yield / back off slightly (offset position)
    const yieldOffsetX = Math.round(recoveryRobot.x + (Math.random() > 0.5 ? 40 : -40));
    const yieldOffsetY = Math.round(recoveryRobot.y + (Math.random() > 0.5 ? 40 : -40));

    this.db.updateRobot(recoveryRobot.id, {
      x: Math.max(50, Math.min(850, yieldOffsetX)),
      y: Math.max(50, Math.min(550, yieldOffsetY)),
      status: 'idle',
      current_task: null,
      target_x: null,
      target_y: null,
    });

    this.db.addEvent(
      'deadlock_route_recalculated',
      recoveryRobot.id,
      null,
      `🧭 Alternative yield route calculated. ${recoveryRobot.id} moved to safe waypoint.`
    );

    // Step 5: Re-negotiate affected task if any
    let reallocatedRobotId: string | null = null;
    if (releasedTask) {
      const taskRecord = this.db.getTaskById(releasedTask);
      if (taskRecord) {
        this.db.updateTask(releasedTask, {
          status: 'pending',
          assigned_robot: null,
        });

        this.db.addEvent(
          'deadlock_task_renegotiation',
          recoveryRobot.id,
          releasedTask,
          `⚡ Task ${releasedTask} returned to autonomous negotiation pool for open bidding.`
        );

        const renegotiationRes = this.negotiationEngine.negotiateTask(taskRecord, true);
        if (renegotiationRes) {
          reallocatedRobotId = renegotiationRes.winner_id;
          this.db.addEvent(
            'deadlock_task_reallocated',
            reallocatedRobotId,
            releasedTask,
            `🏆 Task ${releasedTask} awarded to replacement robot ${reallocatedRobotId} with winning bid score ${renegotiationRes.winner_score}.`
          );
        }
      }
    }

    // Unblock other robots in the cycle so they resume normal movement
    for (const other of involvedRobots) {
      if (other.id !== recoveryRobot.id) {
        const otherTask = other.current_task ? this.db.getTaskById(other.current_task) : null;
        this.db.updateRobot(other.id, {
          status: other.current_task ? 'moving' : 'idle',
          target_x: otherTask ? otherTask.x : other.target_x,
          target_y: otherTask ? otherTask.y : other.target_y,
        });
      }
    }

    // Step 6: Mark Deadlock RECOVERED and clear remaining wait-for edges
    this.db.clearActiveDependencies();
    const recoveredTime = new Date().toISOString();

    const actionText = `Yielded ${recoveryRobot.id}, recalculated route, reallocated ${releasedTask || 'task'} to ${reallocatedRobotId || 'fleet'}`;
    this.db.updateDeadlock(deadlockId, {
      status: 'RECOVERED',
      recovered_at: recoveredTime,
      recovery_robot: recoveryRobot.id,
      recovery_action: actionText,
    });

    this.db.addEvent(
      'deadlock_recovered',
      recoveryRobot.id,
      releasedTask,
      `✓ DEADLOCK RECOVERED [${deadlockId}]: Full workflow resumed. ${actionText}.`
    );

    return this.db.getDeadlockById(deadlockId);
  }
}
