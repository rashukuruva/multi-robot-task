import { SimulationDatabase, RobotRecord, TaskRecord } from './database.js';
import { NegotiationEngine, NegotiationResult } from './negotiation.js';
import { DeadlockEngine } from './deadlock.js';
import { P2PNegotiationEngine } from './p2p_negotiation.js';
import { CollisionEngine } from './collision.js';

export interface FailureReport {
  failed_robot: RobotRecord;
  interrupted_task: TaskRecord | null;
  reallocation: NegotiationResult | null;
}

export class SimulationManager {
  private db: SimulationDatabase;
  private negotiationEngine: NegotiationEngine;
  private deadlockEngine: DeadlockEngine;
  private p2pEngine: P2PNegotiationEngine;
  private collisionEngine: CollisionEngine;
  private isRunning: boolean = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private speedMultiplier: number = 1.0;
  private targetConcurrentTasks: number = 24; // Keep 20-30 active moving robots for optimal visual clarity & dynamic flow
  private lastTickTime: number = Date.now();
  private tickCounter: number = 0;

  constructor(
    db: SimulationDatabase,
    negotiationEngine: NegotiationEngine,
    deadlockEngine?: DeadlockEngine,
    p2pEngine?: P2PNegotiationEngine,
    collisionEngine?: CollisionEngine
  ) {
    this.db = db;
    this.negotiationEngine = negotiationEngine;
    this.deadlockEngine = deadlockEngine || new DeadlockEngine(db, negotiationEngine);
    this.p2pEngine = p2pEngine || new P2PNegotiationEngine(db);
    this.collisionEngine = collisionEngine || new CollisionEngine(db);
  }

  public getDeadlockEngine(): DeadlockEngine {
    return this.deadlockEngine;
  }

  public getP2PEngine(): P2PNegotiationEngine {
    return this.p2pEngine;
  }

  public getCollisionEngine(): CollisionEngine {
    return this.collisionEngine;
  }

  public getStatus() {
    return {
      running: this.isRunning,
      speed: this.speedMultiplier,
      targetConcurrentTasks: this.targetConcurrentTasks,
    };
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTickTime = Date.now();
    this.db.addEvent('simulation_start', null, null, 'Simulation loop started.');

    // Internal tick loop every 200ms
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      this.tick();
    }, 200);
  }

  public pause() {
    this.isRunning = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    this.db.addEvent('simulation_pause', null, null, 'Simulation loop paused.');
  }

  public setSpeed(speed: number) {
    this.speedMultiplier = Math.max(0.5, Math.min(5.0, speed));
  }

  public reset() {
    this.pause();
    this.db.seedData(true);
  }

  public tick(): { movedRobots: number; completedTasks: number; newNegotiations: number } {
    const now = Date.now();
    const dt = Math.min(1.0, (now - this.lastTickTime) / 1000); // delta in seconds
    this.lastTickTime = now;

    let movedCount = 0;
    let completedCount = 0;
    let newNegotiations = 0;

    // Feature 3: Update active path reservations and release paths if reserving robot cleared intersection
    this.collisionEngine.updateReservationsAndReleasePaths();

    // Feature 3: Pre-move Collision Scan & Avoidance Protocol
    const movingRobots = this.db.getRobots({ status: 'moving' });
    this.collisionEngine.detectAndArbitrateCollisions(movingRobots);

    // 1. Move all moving robots toward their target tasks (robots in 'waiting' state hold position)
    const activeMovingRobots = this.db.getRobots({ status: 'moving' });

    for (const robot of activeMovingRobots) {
      if (robot.target_x == null || robot.target_y == null || !robot.current_task) {
        continue;
      }

      const dx = robot.target_x - robot.x;
      const dy = robot.target_y - robot.y;
      const dist = Math.hypot(dx, dy);

      const step = robot.speed * 8.0 * this.speedMultiplier * dt; // units to move this tick

      if (dist <= Math.max(4.0, step)) {
        // Arrived at destination! Task is completed
        const taskId = robot.current_task;
        this.db.updateTask(taskId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        // Drain tiny battery based on distance
        const newBattery = Math.max(5, Number((robot.battery - 0.5).toFixed(1)));

        // Return robot position to its group home hub
        const groupHubs: Record<string, { x: number; y: number }> = {
          'Group A': { x: 170, y: 150 },
          'Group B': { x: 730, y: 150 },
          'Group C': { x: 170, y: 450 },
          'Group D': { x: 730, y: 450 },
        };
        const hub = groupHubs[robot.group_id] || { x: 170, y: 150 };
        const idNum = parseInt(robot.id.replace(/\D/g, ''), 10) || 1;
        const angle = (idNum % 125) * (2 * Math.PI / 125);
        const radius = 8 + ((idNum * 11) % 36);
        const homeX = Math.round(hub.x + Math.cos(angle) * radius);
        const homeY = Math.round(hub.y + Math.sin(angle) * radius);

        this.db.updateRobot(robot.id, {
          x: homeX,
          y: homeY,
          status: 'idle',
          current_task: null,
          target_x: null,
          target_y: null,
          battery: newBattery,
          tasks_completed: robot.tasks_completed + 1,
          total_distance: Number((robot.total_distance + dist).toFixed(1)),
        });

        // Broadcast Feature 1 TASK_COMPLETED message
        this.db.addP2PMessage({
          sender_id: robot.id,
          receiver_id: 'ALL',
          message_type: 'TASK_COMPLETED',
          task_id: taskId,
          payload: { completed_at: new Date().toISOString(), tasks_completed: robot.tasks_completed + 1 },
        });

        this.db.addEvent(
          'task_completed',
          robot.id,
          taskId,
          `✅ Task ${taskId} completed by ${robot.id}. Robot returned to ${robot.group_id} hub station.`
        );

        completedCount++;
      } else {
        // Move towards target
        const nx = robot.x + (dx / dist) * step;
        const ny = robot.y + (dy / dist) * step;
        const newBattery = Math.max(5, Number((robot.battery - 0.02 * step).toFixed(2)));

        this.db.updateRobot(robot.id, {
          x: Number(nx.toFixed(2)),
          y: Number(ny.toFixed(2)),
          battery: newBattery,
          total_distance: Number((robot.total_distance + step).toFixed(1)),
        });

        movedCount++;
      }
    }

    // 2. If simulation is running and active moving robots < targetConcurrentTasks, conduct P2P task negotiations
    if (this.isRunning) {
      const activeMoving = this.db.getRobots({ status: 'moving' }).length;
      const deficit = this.targetConcurrentTasks - activeMoving;

      if (deficit > 0) {
        // Take a small batch of 2-3 tasks to allocate smoothly via P2P auction
        const pendingTasks = this.db.getTasks({ status: 'pending', limit: Math.min(3, deficit) });
        for (const t of pendingTasks) {
          const session = this.p2pEngine.conductP2PNegotiation(t);
          if (session) {
            newNegotiations++;
          }
        }
      }
    }

    // 3. Periodically check wait-for graph for cycle deadlocks (every 5 ticks ~ 1s)
    this.tickCounter++;
    if (this.tickCounter % 5 === 0) {
      this.deadlockEngine.checkAndDetectDeadlocks();
    }

    return { movedRobots: movedCount, completedTasks: completedCount, newNegotiations };
  }

  /**
   * Fail a specific robot or trigger failure recovery
   */
  public simulateFailure(robotId?: string): FailureReport | null {
    let targetRobot: RobotRecord | null = null;

    if (robotId) {
      targetRobot = this.db.getRobotById(robotId);
    } else {
      // Find a moving robot first
      const movingRobots = this.db.getRobots({ status: 'moving' });
      if (movingRobots.length > 0) {
        targetRobot = movingRobots[Math.floor(Math.random() * movingRobots.length)];
      } else {
        // Fallback to any non-failed robot
        const allRobots = this.db.getRobots().filter(r => r.failed === 0);
        if (allRobots.length > 0) {
          targetRobot = allRobots[Math.floor(Math.random() * allRobots.length)];
        }
      }
    }

    if (!targetRobot) return null;

    const interruptedTaskId = targetRobot.current_task;
    let interruptedTask: TaskRecord | null = null;
    let reallocation: NegotiationResult | null = null;

    // 1. Mark robot failed
    this.db.updateRobot(targetRobot.id, {
      status: 'failed',
      failed: 1,
      current_task: null,
      target_x: null,
      target_y: null,
    });

    this.db.addEvent(
      'robot_failed',
      targetRobot.id,
      interruptedTaskId,
      `⚠️ CRITICAL: Robot ${targetRobot.id} encountered hardware fault and marked FAILED!`
    );

    // 2. If it had an active task, mark task pending and trigger instant renegotiation
    if (interruptedTaskId) {
      interruptedTask = this.db.getTaskById(interruptedTaskId);

      if (interruptedTask) {
        this.db.updateTask(interruptedTaskId, {
          status: 'pending',
          assigned_robot: null,
        });

        this.db.addEvent(
          'renegotiation_started',
          targetRobot.id,
          interruptedTaskId,
          `🔄 Task ${interruptedTaskId} dropped due to failure of ${targetRobot.id}. Autonomous re-negotiation initiated.`
        );

        // Immediate re-negotiation
        reallocation = this.negotiationEngine.negotiateTask(interruptedTask, true);
      }
    }

    return {
      failed_robot: { ...targetRobot, status: 'failed', failed: 1 },
      interrupted_task: interruptedTask,
      reallocation,
    };
  }

  /**
   * Helper to fetch complete live simulation payload for frontend
   */
  public getLiveState() {
    const stats = this.db.getStatistics();
    
    // Return all robots so idle robots are visible stationed in their group hubs
    // and active robots are visible dynamically moving to tasks
    const allRobots = this.db.getRobots();

    // Tasks: pending, assigned, in_progress, recently completed
    const activeTasks = this.db.getTasks().filter(t => 
      t.status === 'in_progress' || 
      t.status === 'assigned' || 
      t.status === 'pending'
    );

    const completedTasks = this.db.getTasks({ status: 'completed', limit: 50 });

    const recentLogs = this.db.getNegotiationLog(15);
    const recentEvents = this.db.getEvents(20);
    const deadlockMetrics = this.db.getDeadlockMetrics();
    const activeDeadlocks = this.db.getDeadlocks('DETECTED').concat(this.db.getDeadlocks('RECOVERING'));
    const latestDeadlock = activeDeadlocks.length > 0 ? activeDeadlocks[0] : (this.db.getDeadlocks('all', 1)[0] || null);
    const waitForGraph = this.deadlockEngine.getWaitForGraph();

    // Features 1, 2, 3 Data Payloads
    const p2pSessions = this.p2pEngine.getRecentSessions();
    const p2pMessages = this.db.getP2PMessages(35);
    const taskConflicts = this.p2pEngine.getActiveTaskConflicts();
    const resourceConflicts = this.p2pEngine.getActiveResourceConflicts();
    const activeReservations = this.collisionEngine.getActiveReservations();
    const recentRisks = this.db.getCollisionRisks(15);
    const recentArbitrations = this.collisionEngine.getRecentArbitrations();
    const corridors = this.collisionEngine.getCorridors();

    return {
      simulation: this.getStatus(),
      statistics: stats,
      activeRobots: allRobots,
      activeTasks: [...activeTasks, ...completedTasks],
      recentLogs,
      recentEvents,
      weights: this.negotiationEngine.getWeights(),
      deadlock: {
        metrics: deadlockMetrics,
        activeDeadlocks,
        latestDeadlock,
        waitForGraph,
        recoveryPolicy: this.deadlockEngine.getRecoveryPolicy(),
      },
      p2p: {
        sessions: p2pSessions,
        messages: p2pMessages,
        latestSession: p2pSessions[0] || null,
      },
      conflicts: {
        taskConflicts,
        resourceConflicts,
        latestTaskConflict: taskConflicts[0] || null,
        latestResourceConflict: resourceConflicts[0] || null,
      },
      collision: {
        activeReservations,
        recentRisks,
        recentArbitrations,
        latestArbitration: recentArbitrations[0] || null,
        corridors,
      },
    };
  }
}
