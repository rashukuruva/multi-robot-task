import { SimulationDatabase, RobotRecord, TaskRecord, CollisionRiskRecord } from './database.js';

export interface PathReservation {
  id: string;
  zone_name: string;
  reserved_by: string;
  waiting_robot: string;
  intersection_x: number;
  intersection_y: number;
  created_at: number;
  cleared: boolean;
}

export interface CorridorZone {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  occupied_by: string | null;
  waiting_queue: string[];
}

export interface CollisionArbitrationResult {
  risk_id: string;
  robot1_id: string;
  robot2_id: string;
  risk_type: 'too_close' | 'same_location' | 'same_path' | 'crossing_path';
  intersection: { x: number; y: number };
  p2p_messages: {
    sender: string;
    recipient: string;
    type: string;
    text: string;
  }[];
  granted_robot: string;
  waiting_robot: string;
  priority_factors: {
    robot_id: string;
    task_priority_score: number;
    distance_travelled_score: number;
    battery_score: number;
    intersection_proximity_score: number;
    total_priority: number;
  }[];
  timestamp: string;
}

export class CollisionEngine {
  private db: SimulationDatabase;
  private activeReservations: Map<string, PathReservation> = new Map();
  private recentArbitrations: CollisionArbitrationResult[] = [];

  // Designated narrow corridors in the 900x600 arena
  public readonly corridors: CorridorZone[] = [
    {
      id: 'CORRIDOR_A',
      name: 'PATH A (Central Bottleneck)',
      x: 420,
      y: 270,
      width: 60,
      height: 60,
      occupied_by: null,
      waiting_queue: [],
    },
    {
      id: 'CORRIDOR_B',
      name: 'PATH B (North Crossing)',
      x: 420,
      y: 120,
      width: 60,
      height: 60,
      occupied_by: null,
      waiting_queue: [],
    },
    {
      id: 'CORRIDOR_C',
      name: 'PATH C (South Crossing)',
      x: 420,
      y: 420,
      width: 60,
      height: 60,
      occupied_by: null,
      waiting_queue: [],
    },
  ];

  constructor(db: SimulationDatabase) {
    this.db = db;
  }

  public getActiveReservations(): PathReservation[] {
    return Array.from(this.activeReservations.values()).filter(r => !r.cleared);
  }

  public getRecentArbitrations(): CollisionArbitrationResult[] {
    return this.recentArbitrations.slice(0, 20);
  }

  public getCorridors(): CorridorZone[] {
    return this.corridors;
  }

  /**
   * Evaluates line segment intersection between Robot 1 planned segment and Robot 2 planned segment
   */
  private checkSegmentIntersection(
    p0_x: number, p0_y: number, p1_x: number, p1_y: number,
    p2_x: number, p2_y: number, p3_x: number, p3_y: number
  ): { x: number; y: number } | null {
    const s1_x = p1_x - p0_x;
    const s1_y = p1_y - p0_y;
    const s2_x = p3_x - p2_x;
    const s2_y = p3_y - p2_y;

    const denom = (-s2_x * s1_y + s1_x * s2_y);
    if (Math.abs(denom) < 0.0001) return null; // collinear or parallel

    const s = (-s1_y * (p0_x - p2_x) + s1_x * (p0_y - p2_y)) / denom;
    const t = ( s2_x * (p0_y - p2_y) - s2_y * (p0_x - p2_x)) / denom;

    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
      // Collision point exists on both planned paths
      return {
        x: Number((p0_x + (t * s1_x)).toFixed(1)),
        y: Number((p0_y + (t * s1_y)).toFixed(1)),
      };
    }
    return null;
  }

  /**
   * Priority Rule Arbitration formula combining:
   * 1. Task priority
   * 2. Distance already travelled
   * 3. Robot battery
   * 4. Robot status
   * 5. Which robot reached / is closest to intersection first
   */
  public evaluateRobotPriority(
    robot: RobotRecord,
    task: TaskRecord | null,
    intersectionX: number,
    intersectionY: number
  ) {
    // 1. Task Priority score (10 - 40)
    let prioScore = 15;
    if (task) {
      if (task.priority === 'Critical') prioScore = 40;
      else if (task.priority === 'High') prioScore = 30;
      else if (task.priority === 'Medium') prioScore = 20;
      else prioScore = 10;
    }

    // 2. Distance already travelled (sunk cost investment)
    const travelScore = Math.min(25, (robot.total_distance / 20));

    // 3. Robot battery (vital operating health)
    const batteryScore = (robot.battery / 100) * 20;

    // 4. Proximity / time to intersection (who reached first / closer gets advantage)
    const distToIntersection = Math.hypot(robot.x - intersectionX, robot.y - intersectionY);
    const timeToIntersection = distToIntersection / (robot.speed * 8.0);
    const proximityScore = Math.max(0, 20 - timeToIntersection * 2.5);

    const totalPriority = Number((prioScore + travelScore + batteryScore + proximityScore).toFixed(1));

    return {
      robot_id: robot.id,
      task_priority_score: prioScore,
      distance_travelled_score: Number(travelScore.toFixed(1)),
      battery_score: Number(batteryScore.toFixed(1)),
      intersection_proximity_score: Number(proximityScore.toFixed(1)),
      total_priority: totalPriority,
    };
  }

  /**
   * Pre-move Collision Scan & Avoidance Protocol
   * Checks every moving robot against other moving robots before tick step
   */
  public detectAndArbitrateCollisions(movingRobots: RobotRecord[]): CollisionArbitrationResult[] {
    const results: CollisionArbitrationResult[] = [];
    const checkedPairs = new Set<string>();

    for (let i = 0; i < movingRobots.length; i++) {
      const r1 = movingRobots[i];
      if (r1.target_x == null || r1.target_y == null) continue;

      for (let j = i + 1; j < movingRobots.length; j++) {
        const r2 = movingRobots[j];
        if (r2.target_x == null || r2.target_y == null) continue;

        const pairKey = [r1.id, r2.id].sort().join(':');
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        // Skip if one of them is already waiting under an active reservation
        const existingRes = Array.from(this.activeReservations.values()).find(
          res => !res.cleared && (res.waiting_robot === r1.id || res.waiting_robot === r2.id)
        );
        if (existingRes) continue;

        let riskType: 'too_close' | 'same_location' | 'same_path' | 'crossing_path' | null = null;
        let intersectPt = { x: (r1.x + r2.x) / 2, y: (r1.y + r2.y) / 2 };

        const currentDist = Math.hypot(r1.x - r2.x, r1.y - r2.y);
        const targetDist = Math.hypot(r1.target_x - r2.target_x, r1.target_y - r2.target_y);

        // Check 1: Too close right now (proximity warning)
        if (currentDist < 26) {
          riskType = 'too_close';
        }
        // Check 2: Moving toward the same location
        else if (targetDist < 28) {
          riskType = 'same_location';
          intersectPt = { x: (r1.target_x + r2.target_x) / 2, y: (r1.target_y + r2.target_y) / 2 };
        }
        // Check 3: Crossing paths (line segment intersection with imminent arrival window)
        else {
          const crossing = this.checkSegmentIntersection(
            r1.x, r1.y, r1.target_x, r1.target_y,
            r2.x, r2.y, r2.target_x, r2.target_y
          );

          if (crossing) {
            const dist1 = Math.hypot(r1.x - crossing.x, r1.y - crossing.y);
            const dist2 = Math.hypot(r2.x - crossing.x, r2.y - crossing.y);
            const t1 = dist1 / (r1.speed * 8.0);
            const t2 = dist2 / (r2.speed * 8.0);

            // If time-to-collision window < 3.2 seconds
            if (Math.abs(t1 - t2) < 3.2 && dist1 < 120 && dist2 < 120) {
              riskType = 'crossing_path';
              intersectPt = crossing;
            }
          }
        }

        // If risk detected, trigger P2P message exchange and priority arbitration
        if (riskType) {
          const arbitrated = this.executeCollisionArbitration(r1, r2, riskType, intersectPt);
          results.push(arbitrated);
        }
      }
    }

    return results;
  }

  /**
   * Executes collision resolution and reservation sequence:
   * 1. Direct message exchange: PATH_REQUEST / PATH_REQUEST
   * 2. Priority rule evaluation
   * 3. Winner: PATH_GRANTED, MOVE
   * 4. Loser: WAIT (status: 'waiting')
   * 5. Record path reservation
   */
  public executeCollisionArbitration(
    r1: RobotRecord,
    r2: RobotRecord,
    riskType: 'too_close' | 'same_location' | 'same_path' | 'crossing_path',
    intersectPt: { x: number; y: number }
  ): CollisionArbitrationResult {
    const task1 = r1.current_task ? this.db.getTaskById(r1.current_task) : null;
    const task2 = r2.current_task ? this.db.getTaskById(r2.current_task) : null;

    const p1 = this.evaluateRobotPriority(r1, task1, intersectPt.x, intersectPt.y);
    const p2 = this.evaluateRobotPriority(r2, task2, intersectPt.x, intersectPt.y);

    const winner = p1.total_priority >= p2.total_priority ? r1 : r2;
    const loser = p1.total_priority >= p2.total_priority ? r2 : r1;

    const now = new Date().toISOString();
    const riskId = `CR-${Date.now()}-${r1.id}-${r2.id}`;

    // Direct P2P Communication Log
    const p2pMessages = [
      { sender: r1.id, recipient: r2.id, type: 'PATH_REQUEST', text: `${r1.id} → PATH_REQUEST` },
      { sender: r2.id, recipient: r1.id, type: 'PATH_REQUEST', text: `${r2.id} → PATH_REQUEST` },
      { sender: 'ARBITRATION', recipient: winner.id, type: 'PATH_GRANTED', text: `${winner.id} → PATH_GRANTED (MOVE)` },
      { sender: 'ARBITRATION', recipient: loser.id, type: 'WAIT', text: `${loser.id} → WAIT (Path reserved by ${winner.id})` },
    ];

    // Log messages to DB
    for (const msg of p2pMessages) {
      this.db.addP2PMessage({
        sender_id: msg.sender,
        receiver_id: msg.recipient,
        message_type: (msg.type as any),
        task_id: null,
        payload: { text: msg.text, riskId },
        timestamp: now,
      });
    }

    // Set loser to 'waiting' state to halt movement
    this.db.updateRobot(loser.id, { status: 'waiting' });

    // Store Path Reservation
    const reservation: PathReservation = {
      id: riskId,
      zone_name: `Intersection (${intersectPt.x}, ${intersectPt.y})`,
      reserved_by: winner.id,
      waiting_robot: loser.id,
      intersection_x: intersectPt.x,
      intersection_y: intersectPt.y,
      created_at: Date.now(),
      cleared: false,
    };
    this.activeReservations.set(riskId, reservation);

    // Save Collision Risk Record
    const riskRecord: CollisionRiskRecord = {
      id: riskId,
      robot1_id: r1.id,
      robot2_id: r2.id,
      intersection_x: intersectPt.x,
      intersection_y: intersectPt.y,
      risk_type: riskType,
      priority_robot: winner.id,
      waiting_robot: loser.id,
      status: 'AVOIDING',
      details: `Collision predicted (${riskType}). ${winner.id} granted MOVE. ${loser.id} ordered WAIT. Path reserved.`,
      timestamp: now,
    };
    this.db.addCollisionRisk(riskRecord);

    this.db.addEvent(
      'collision_risk_detected',
      winner.id,
      null,
      `⚠ COLLISION RISK: Potential collision between ${r1.id} & ${r2.id}. Priority arbitration: ${winner.id} granted MOVE; ${loser.id} ordered WAIT.`
    );

    const result: CollisionArbitrationResult = {
      risk_id: riskId,
      robot1_id: r1.id,
      robot2_id: r2.id,
      risk_type: riskType,
      intersection: intersectPt,
      p2p_messages: p2pMessages,
      granted_robot: winner.id,
      waiting_robot: loser.id,
      priority_factors: [p1, p2],
      timestamp: now,
    };

    this.recentArbitrations.unshift(result);
    if (this.recentArbitrations.length > 25) this.recentArbitrations.pop();

    return result;
  }

  /**
   * Monitor Active Reservations & Release Cleared Paths
   * Once R-101 moves past the conflict intersection:
   * R-101 → PATH_RELEASE
   * R-204 → PATH_GRANTED
   * R-204 → MOVE
   */
  public updateReservationsAndReleasePaths() {
    for (const [id, res] of this.activeReservations.entries()) {
      if (res.cleared) continue;

      const reservingRobot = this.db.getRobotById(res.reserved_by);
      const waitingRobot = this.db.getRobotById(res.waiting_robot);

      if (!reservingRobot || !waitingRobot) {
        res.cleared = true;
        continue;
      }

      // Check distance of reserving robot from intersection
      const distFromIntersection = Math.hypot(
        reservingRobot.x - res.intersection_x,
        reservingRobot.y - res.intersection_y
      );

      // Cleared condition: Reserving robot is now > 28 units away or completed task, or timeout 10s
      const elapsed = Date.now() - res.created_at;
      const isPastIntersection = distFromIntersection > 28 || reservingRobot.status === 'idle' || reservingRobot.status === 'completed' || elapsed > 8000;

      if (isPastIntersection) {
        res.cleared = true;
        const now = new Date().toISOString();

        // Release messages:
        // R-101 → PATH_RELEASE
        // R-204 → PATH_GRANTED
        // R-204 → MOVE
        this.db.addP2PMessage({
          sender_id: reservingRobot.id,
          receiver_id: 'ALL',
          message_type: 'PATH_RELEASE',
          task_id: null,
          payload: { intersection: { x: res.intersection_x, y: res.intersection_y } },
          timestamp: now,
        });

        this.db.addP2PMessage({
          sender_id: 'SYSTEM',
          receiver_id: waitingRobot.id,
          message_type: 'PATH_GRANTED',
          task_id: null,
          payload: { text: 'Path cleared' },
          timestamp: now,
        });

        this.db.addP2PMessage({
          sender_id: waitingRobot.id,
          receiver_id: 'SELF',
          message_type: 'MOVE',
          task_id: null,
          payload: { text: 'Resuming movement' },
          timestamp: now,
        });

        // Restore waiting robot to 'moving'
        if (waitingRobot.status === 'waiting') {
          this.db.updateRobot(waitingRobot.id, { status: 'moving' });
        }

        // Update DB record
        this.db.updateCollisionRisk(res.id, { status: 'RESOLVED' });

        this.db.addEvent(
          'path_released',
          waitingRobot.id,
          null,
          `🟢 PATH RELEASE: ${reservingRobot.id} cleared path. ${waitingRobot.id} granted PATH_GRANTED → MOVE.`
        );

        this.activeReservations.delete(id);
      }
    }
  }

  /**
   * Interactive Trigger: Simulate real-time collision risk scenario between two robots
   */
  public simulateCollisionScenario(): CollisionArbitrationResult | null {
    const movingRobots = this.db.getRobots({ status: 'moving' });
    let r1 = movingRobots[0];
    let r2 = movingRobots[1];

    if (!r1 || !r2) {
      // Pick two idle robots, point them head-on toward central collision point
      const allRobots = this.db.getRobots({ status: 'idle' });
      if (allRobots.length < 2) return null;
      r1 = allRobots[0];
      r2 = allRobots[1];

      // Setup head-on crossing at center (450, 300)
      this.db.updateRobot(r1.id, {
        x: 350,
        y: 300,
        target_x: 550,
        target_y: 300,
        status: 'moving',
        speed: 3.2,
      });

      this.db.updateRobot(r2.id, {
        x: 550,
        y: 300,
        target_x: 350,
        target_y: 300,
        status: 'moving',
        speed: 3.0,
      });
    }

    const intersectPt = { x: 450, y: 300 };
    return this.executeCollisionArbitration(r1, r2, 'same_path', intersectPt);
  }
}
