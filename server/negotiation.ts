import { SimulationDatabase, RobotRecord, TaskRecord } from './database.js';

export interface NegotiationWeights {
  w_dist: number; // default: 1.0
  w_batt: number; // default: 1.0
  w_work: number; // default: 0.8
  w_prio: number; // default: 1.2
}

export interface BidDetail {
  robot_id: string;
  group_id: string;
  distance: number;
  battery: number;
  tasks_completed: number;
  distance_cost: number;
  battery_cost: number;
  workload_cost: number;
  priority_benefit: number;
  bid_score: number;
}

export interface NegotiationResult {
  task_id: string;
  priority: string;
  winner_id: string;
  winner_score: number;
  bids: BidDetail[];
  renegotiation?: boolean;
}

export class NegotiationEngine {
  private db: SimulationDatabase;
  private weights: NegotiationWeights = {
    w_dist: 1.0,
    w_batt: 1.0,
    w_work: 0.8,
    w_prio: 1.2,
  };

  constructor(db: SimulationDatabase) {
    this.db = db;
  }

  public getWeights(): NegotiationWeights {
    return { ...this.weights };
  }

  public setWeights(newWeights: Partial<NegotiationWeights>) {
    this.weights = { ...this.weights, ...newWeights };
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'Critical': return 4;
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 1;
    }
  }

  /**
   * Transparent Bid Calculation Formula:
   * Bid Score = Distance Cost + Battery Cost + Workload Cost - Priority Benefit
   * Lowest Score Wins the Task Contract
   */
  public calculateBid(robot: RobotRecord, task: TaskRecord): BidDetail {
    const dx = robot.x - task.x;
    const dy = robot.y - task.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Distance Cost: scale roughly 0-25
    const distance_cost = Number(((distance / 40) * this.weights.w_dist).toFixed(2));
    
    // Battery Cost: lower battery = higher cost penalty (0-20)
    const battery_cost = Number((((100 - robot.battery) / 100 * 20) * this.weights.w_batt).toFixed(2));
    
    // Workload Cost: load balancing (0-15)
    const workload_cost = Number(((robot.tasks_completed * 1.5) * this.weights.w_work).toFixed(2));
    
    // Priority Benefit: higher priority tasks reward rapid pickup
    const priorityVal = this.getPriorityValue(task.priority);
    const priority_benefit = Number(((priorityVal * 3.0) * this.weights.w_prio).toFixed(2));

    const bid_score = Number((distance_cost + battery_cost + workload_cost - priority_benefit).toFixed(2));

    return {
      robot_id: robot.id,
      group_id: robot.group_id,
      distance: Number(distance.toFixed(1)),
      battery: robot.battery,
      tasks_completed: robot.tasks_completed,
      distance_cost,
      battery_cost,
      workload_cost,
      priority_benefit,
      bid_score,
    };
  }

  /**
   * Negotiate and allocate a specific task
   */
  public negotiateTask(task: TaskRecord, isRenegotiation: boolean = false): NegotiationResult | null {
    // 1. Find eligible robots: idle, not failed, battery >= 15%
    const eligibleRobots = this.db.getRobots({ status: 'idle' }).filter(r => r.failed === 0 && r.battery >= 15);

    if (eligibleRobots.length === 0) {
      this.db.addEvent(
        'negotiation_stalled',
        null,
        task.id,
        `Task ${task.id} could not be allocated: 0 eligible idle robots available.`
      );
      return null;
    }

    // 2. To simulate distributed multi-robot auction without latency,
    // evaluate candidate robots (sampling closest robots from across the groups)
    // Calculate distance for all eligible robots
    const robotsWithDist = eligibleRobots.map(robot => {
      const dx = robot.x - task.x;
      const dy = robot.y - task.y;
      return { robot, dist: Math.hypot(dx, dy) };
    });

    // Sort by proximity and select top candidates (e.g. 5-8 candidate bidding robots)
    robotsWithDist.sort((a, b) => a.dist - b.dist);
    const candidateRobots = robotsWithDist.slice(0, Math.min(8, robotsWithDist.length)).map(item => item.robot);

    // 3. Collect bids
    const bids: BidDetail[] = [];
    const timestamp = new Date().toISOString();

    for (const robot of candidateRobots) {
      const bid = this.calculateBid(robot, task);
      bids.push(bid);
    }

    // 4. Compare bids - lowest bid score wins
    bids.sort((a, b) => a.bid_score - b.bid_score);
    const winnerBid = bids[0];

    // 5. Record negotiation bids in database
    for (const bid of bids) {
      this.db.addNegotiation({
        task_id: task.id,
        robot_id: bid.robot_id,
        bid_score: bid.bid_score,
        distance: bid.distance,
        battery: bid.battery,
        workload: bid.tasks_completed,
        result: bid.robot_id === winnerBid.robot_id ? 'winner' : 'rejected',
        timestamp,
      });
    }

    // 6. Assign task to winner robot
    this.db.updateRobot(winnerBid.robot_id, {
      status: 'moving',
      current_task: task.id,
      target_x: task.x,
      target_y: task.y,
    });

    this.db.updateTask(task.id, {
      status: 'in_progress',
      assigned_robot: winnerBid.robot_id,
      winning_bid: winnerBid.bid_score,
    });

    const prefix = isRenegotiation ? '🔄 [RE-NEGOTIATION]' : '⚡ [NEGOTIATION]';
    this.db.addEvent(
      isRenegotiation ? 'task_reassigned' : 'task_assigned',
      winnerBid.robot_id,
      task.id,
      `${prefix} Task ${task.id} (${task.priority}) awarded to ${winnerBid.robot_id} (${winnerBid.group_id}) with winning bid ${winnerBid.bid_score}`
    );

    return {
      task_id: task.id,
      priority: task.priority,
      winner_id: winnerBid.robot_id,
      winner_score: winnerBid.bid_score,
      bids,
      renegotiation: isRenegotiation,
    };
  }

  /**
   * Batch negotiate multiple pending tasks
   */
  public negotiatePendingBatch(maxBatch: number = 5): NegotiationResult[] {
    const pendingTasks = this.db.getTasks({ status: 'pending', limit: maxBatch });
    const results: NegotiationResult[] = [];

    // Sort tasks by priority: Critical > High > Medium > Low
    pendingTasks.sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority));

    for (const task of pendingTasks) {
      const res = this.negotiateTask(task, false);
      if (res) {
        results.push(res);
      }
    }

    return results;
  }
}
