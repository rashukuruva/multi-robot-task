import { SimulationDatabase, RobotRecord, TaskRecord, TaskConflictRecord, ResourceConflictRecord } from './database.js';

export interface P2PBid {
  robot_id: string;
  group_id: string;
  distance: number;
  battery: number;
  workload: number;
  priority: string;
  est_completion_time_sec: number;
  bid_score: number;
  factors: {
    distance_cost: number;
    battery_cost: number;
    workload_cost: number;
    priority_benefit: number;
    time_cost: number;
  };
}

export interface P2PNegotiationSession {
  task_id: string;
  task_priority: string;
  task_x: number;
  task_y: number;
  candidate_robots: string[];
  bids: P2PBid[];
  winner_id: string;
  winner_bid: number;
  messages: {
    message_type: 'TASK_REQUEST' | 'TASK_BID' | 'TASK_ACCEPT' | 'TASK_REJECT' | 'TASK_COMPLETED';
    sender_id: string;
    receiver_id: string;
    summary: string;
    timestamp: string;
  }[];
  timestamp: string;
}

export class P2PNegotiationEngine {
  private db: SimulationDatabase;
  private recentSessions: P2PNegotiationSession[] = [];
  private activeTaskConflicts: TaskConflictRecord[] = [];
  private activeResourceConflicts: ResourceConflictRecord[] = [];

  constructor(db: SimulationDatabase) {
    this.db = db;
  }

  public getRecentSessions(): P2PNegotiationSession[] {
    return this.recentSessions.slice(0, 20);
  }

  public getActiveTaskConflicts(): TaskConflictRecord[] {
    return this.db.getTaskConflicts(15);
  }

  public getActiveResourceConflicts(): ResourceConflictRecord[] {
    return this.db.getResourceConflicts(15);
  }

  /**
   * Autonomous Robot-Calculated Bid Score
   * Bidding rule taking into account all 5 core factors:
   * 1. Distance to task
   * 2. Battery level
   * 3. Current workload (tasks completed)
   * 4. Task priority (Critical, High, Medium, Low)
   * 5. Estimated completion time: (distance / speed) + task execution constant
   */
  public calculateRobotBid(robot: RobotRecord, task: TaskRecord): P2PBid {
    const dx = robot.x - task.x;
    const dy = robot.y - task.y;
    const distance = Math.hypot(dx, dy);

    // 1. Distance cost (scaled)
    const distance_cost = Number((distance / 35).toFixed(2));

    // 2. Battery cost: lower battery incurs heavy penalty
    const battery_cost = Number((((100 - robot.battery) / 100) * 18).toFixed(2));

    // 3. Workload cost: load balancing across robots
    const workload_cost = Number((robot.tasks_completed * 1.8).toFixed(2));

    // 4. Task priority benefit: Critical tasks incentivize rapid allocation
    let prioMultiplier = 1.0;
    if (task.priority === 'Critical') prioMultiplier = 4.0;
    else if (task.priority === 'High') prioMultiplier = 3.0;
    else if (task.priority === 'Medium') prioMultiplier = 2.0;
    const priority_benefit = Number((prioMultiplier * 2.5).toFixed(2));

    // 5. Estimated completion time (seconds)
    const travelTime = distance / (robot.speed * 8.0);
    const est_completion_time_sec = Number((travelTime + 2.0).toFixed(1));
    const time_cost = Number((est_completion_time_sec * 0.8).toFixed(2));

    // Transparent aggregated bid score (lower is superior)
    const rawScore = distance_cost + battery_cost + workload_cost + time_cost - priority_benefit;
    const bid_score = Number(Math.max(5.0, rawScore).toFixed(1));

    return {
      robot_id: robot.id,
      group_id: robot.group_id,
      distance: Number(distance.toFixed(1)),
      battery: robot.battery,
      workload: robot.tasks_completed,
      priority: task.priority,
      est_completion_time_sec,
      bid_score,
      factors: {
        distance_cost,
        battery_cost,
        workload_cost,
        priority_benefit,
        time_cost,
      },
    };
  }

  /**
   * P2P Task Negotiation:
   * Direct peer-to-peer auction among nearby candidate robots
   */
  public conductP2PNegotiation(task: TaskRecord): P2PNegotiationSession | null {
    // 1. Identify nearby eligible idle robots (battery >= 15%, not failed)
    const eligibleRobots = this.db.getRobots({ status: 'idle' }).filter(r => r.failed === 0 && r.battery >= 15);

    if (eligibleRobots.length === 0) {
      return null;
    }

    // Sort by proximity and select top 3-5 candidate robots for true peer auction
    const candidatesWithDist = eligibleRobots.map(r => ({
      robot: r,
      dist: Math.hypot(r.x - task.x, r.y - task.y),
    }));
    candidatesWithDist.sort((a, b) => a.dist - b.dist);

    // Pick top 3 to 4 candidates (e.g. R-101, R-204, R-315)
    const topCandidates = candidatesWithDist.slice(0, Math.min(4, candidatesWithDist.length)).map(c => c.robot);

    const now = new Date().toISOString();
    const sessionMessages: P2PNegotiationSession['messages'] = [];

    // Protocol Step 1: TASK_REQUEST broadcast to nearby peers
    for (const r of topCandidates) {
      const msgText = `TASK_REQUEST: Task ${task.id} (${task.priority}) available at (${task.x}, ${task.y})`;
      this.db.addP2PMessage({
        sender_id: 'BROADCAST',
        receiver_id: r.id,
        message_type: 'TASK_REQUEST',
        task_id: task.id,
        payload: { task_id: task.id, priority: task.priority, x: task.x, y: task.y },
        timestamp: now,
      });

      sessionMessages.push({
        message_type: 'TASK_REQUEST',
        sender_id: 'TASK_BROADCAST',
        receiver_id: r.id,
        summary: `TASK_REQUEST → ${r.id}`,
        timestamp: now,
      });
    }

    // Protocol Step 2: Candidates compute independent bids and send TASK_BID
    const bids: P2PBid[] = [];
    for (const robot of topCandidates) {
      const bid = this.calculateRobotBid(robot, task);
      bids.push(bid);

      this.db.addP2PMessage({
        sender_id: robot.id,
        receiver_id: 'PEERS',
        message_type: 'TASK_BID',
        task_id: task.id,
        payload: bid,
        timestamp: now,
      });

      sessionMessages.push({
        message_type: 'TASK_BID',
        sender_id: robot.id,
        receiver_id: 'PEERS',
        summary: `${robot.id} → TASK_BID: ${bid.bid_score}`,
        timestamp: now,
      });
    }

    // Protocol Step 3: Peer Consensus - lowest bid score wins the task contract
    bids.sort((a, b) => a.bid_score - b.bid_score);
    const winnerBid = bids[0];

    // If multiple robots submitted bids, log a detected and resolved Task Conflict (Feature 2)
    if (bids.length > 1) {
      const contendingIds = bids.map(b => b.robot_id);
      const resolutionLog = `Task assigned to ${winnerBid.robot_id}. Non-winning peers (${contendingIds.filter(id => id !== winnerBid.robot_id).join(', ')}) searching for another task.`;

      const conflictRecord: TaskConflictRecord = {
        id: `TC-${Date.now()}-${task.id}`,
        task_id: task.id,
        contending_robots: JSON.stringify(contendingIds),
        bids: JSON.stringify(bids),
        status: 'RESOLVED',
        winner_id: winnerBid.robot_id,
        resolution_log: resolutionLog,
        timestamp: now,
      };

      this.db.addTaskConflict(conflictRecord);
    }

    // Protocol Step 4: TASK_ACCEPT to winning robot & TASK_REJECT to losing candidate robots
    for (const b of bids) {
      if (b.robot_id === winnerBid.robot_id) {
        this.db.addP2PMessage({
          sender_id: 'PEER_CONSENSUS',
          receiver_id: b.robot_id,
          message_type: 'TASK_ACCEPT',
          task_id: task.id,
          payload: { task_id: task.id, winning_bid: b.bid_score },
          timestamp: now,
        });

        sessionMessages.push({
          message_type: 'TASK_ACCEPT',
          sender_id: 'PEERS',
          receiver_id: b.robot_id,
          summary: `TASK_ACCEPT → ${b.robot_id} (Score: ${b.bid_score})`,
          timestamp: now,
        });

        // Award task in database
        this.db.updateRobot(b.robot_id, {
          status: 'moving',
          current_task: task.id,
          target_x: task.x,
          target_y: task.y,
        });

        this.db.updateTask(task.id, {
          status: 'in_progress',
          assigned_robot: b.robot_id,
          winning_bid: b.bid_score,
        });
      } else {
        this.db.addP2PMessage({
          sender_id: 'PEER_CONSENSUS',
          receiver_id: b.robot_id,
          message_type: 'TASK_REJECT',
          task_id: task.id,
          payload: { task_id: task.id, status: 'searching_for_another_task' },
          timestamp: now,
        });

        sessionMessages.push({
          message_type: 'TASK_REJECT',
          sender_id: 'PEERS',
          receiver_id: b.robot_id,
          summary: `TASK_REJECT → ${b.robot_id} (Searching for another task)`,
          timestamp: now,
        });
      }

      // Record in standard negotiation history table for backwards compatibility
      this.db.addNegotiation({
        task_id: task.id,
        robot_id: b.robot_id,
        bid_score: b.bid_score,
        distance: b.distance,
        battery: b.battery,
        workload: b.workload,
        result: b.robot_id === winnerBid.robot_id ? 'winner' : 'rejected',
        timestamp: now,
      });
    }

    const session: P2PNegotiationSession = {
      task_id: task.id,
      task_priority: task.priority,
      task_x: task.x,
      task_y: task.y,
      candidate_robots: topCandidates.map(r => r.id),
      bids,
      winner_id: winnerBid.robot_id,
      winner_bid: winnerBid.bid_score,
      messages: sessionMessages,
      timestamp: now,
    };

    this.recentSessions.unshift(session);
    if (this.recentSessions.length > 30) this.recentSessions.pop();

    this.db.addEvent(
      'p2p_negotiation_complete',
      winnerBid.robot_id,
      task.id,
      `🤝 P2P Negotiation: Task ${task.id} (${task.priority}) awarded to ${winnerBid.robot_id} with winning bid ${winnerBid.bid_score}.`
    );

    return session;
  }

  /**
   * Section 2 Conflict Management: Simulate and resolve a direct multi-robot task conflict
   * Specifically formats output as requested:
   * ⚠ TASK CONFLICT
   * Task: T-XX
   * R-101 → Bid 24.5
   * R-204 → Bid 18.2
   * R-315 → Bid 27.1
   * Resolving conflict...
   * Task assigned to R-204
   * R-204 → Assigned
   * R-101 → Searching for another task
   * R-315 → Searching for another task
   */
  public simulateTaskConflict(targetTaskId?: string): TaskConflictRecord {
    let task: TaskRecord | null = null;
    if (targetTaskId) {
      task = this.db.getTaskById(targetTaskId);
    }
    if (!task) {
      const pendingTasks = this.db.getTasks({ status: 'pending', limit: 1 });
      if (pendingTasks.length > 0) {
        task = pendingTasks[0];
      } else {
        const allTasks = this.db.getTasks({ limit: 1 });
        task = allTasks[0];
      }
    }

    // Pick 3 candidate robots
    const robots = this.db.getRobots({ status: 'idle' }).slice(0, 3);
    const candidateRobots = robots.length >= 3 ? robots : this.db.getRobots({ limit: 3 });

    const now = new Date().toISOString();
    const bids: P2PBid[] = [];

    for (const r of candidateRobots) {
      bids.push(this.calculateRobotBid(r, task));
    }

    // Sort to determine winner
    bids.sort((a, b) => a.bid_score - b.bid_score);
    const winner = bids[0];

    const contendingIds = candidateRobots.map(r => r.id);
    const nonWinners = contendingIds.filter(id => id !== winner.robot_id);

    const resolutionLog = `Resolving conflict... Task assigned to ${winner.robot_id}. ${winner.robot_id} → Assigned; ${nonWinners.map(id => `${id} → Searching for another task`).join('; ')}`;

    const conflict: TaskConflictRecord = {
      id: `TC-${Date.now()}-${task.id}`,
      task_id: task.id,
      contending_robots: JSON.stringify(contendingIds),
      bids: JSON.stringify(bids),
      status: 'RESOLVED',
      winner_id: winner.robot_id,
      resolution_log: resolutionLog,
      timestamp: now,
    };

    // Assign winner to task
    this.db.updateRobot(winner.robot_id, {
      status: 'moving',
      current_task: task.id,
      target_x: task.x,
      target_y: task.y,
    });

    this.db.updateTask(task.id, {
      status: 'in_progress',
      assigned_robot: winner.robot_id,
      winning_bid: winner.bid_score,
    });

    this.db.addTaskConflict(conflict);
    this.db.addEvent(
      'task_conflict_resolved',
      winner.robot_id,
      task.id,
      `⚠ TASK CONFLICT on ${task.id} resolved via P2P bidding: ${winner.robot_id} assigned (Bid ${winner.bid_score}). Others searching for tasks.`
    );

    return conflict;
  }

  /**
   * Section 2 Conflict Management: Simulate narrow path / corridor access conflict
   * R-101 ─────► PATH A
   * R-204 ─────► PATH A
   * Robots negotiate access. Robot that doesn't get access enters WAITING.
   */
  public simulateResourceConflict(corridorName: string = 'PATH A (Central Corridor)'): ResourceConflictRecord {
    const movingRobots = this.db.getRobots({ status: 'moving' });
    let r1 = movingRobots[0];
    let r2 = movingRobots[1];

    if (!r1 || !r2) {
      const robots = this.db.getRobots({ limit: 4 });
      r1 = robots[0];
      r2 = robots[1];
    }

    const now = new Date().toISOString();

    // Priority arbitration based on battery + speed
    const score1 = r1.battery + (r1.speed * 10);
    const score2 = r2.battery + (r2.speed * 10);

    const winnerId = score1 >= score2 ? r1.id : r2.id;
    const waitingId = score1 >= score2 ? r2.id : r1.id;

    // Set waiting robot status to waiting
    this.db.updateRobot(waitingId, { status: 'waiting' });

    const conflict: ResourceConflictRecord = {
      id: `RC-${Date.now()}`,
      resource_id: corridorName,
      robot1_id: r1.id,
      robot2_id: r2.id,
      winner_id: winnerId,
      waiting_robot_id: waitingId,
      status: 'ACTIVE',
      reason: `${winnerId} granted corridor access. ${waitingId} entered WAITING state until path is cleared.`,
      timestamp: now,
    };

    this.db.addResourceConflict(conflict);
    this.db.addEvent(
      'resource_conflict',
      winnerId,
      null,
      `⚠ RESOURCE CONFLICT: ${r1.id} and ${r2.id} requested ${corridorName}. ${winnerId} granted access; ${waitingId} entering WAITING.`
    );

    return conflict;
  }
}
