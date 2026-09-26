import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

export interface RobotRecord {
  id: string;
  group_id: string;
  x: number;
  y: number;
  target_x: number | null;
  target_y: number | null;
  battery: number;
  status: 'idle' | 'negotiating' | 'moving' | 'completed' | 'failed' | 'waiting' | 'blocked';
  current_task: string | null;
  speed: number;
  tasks_completed: number;
  failed: number;
  total_distance: number;
}

export interface TaskRecord {
  id: string;
  x: number;
  y: number;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'pending' | 'negotiating' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  assigned_robot: string | null;
  created_at: string;
  completed_at: string | null;
  winning_bid: number | null;
}

export interface NegotiationRecord {
  id?: number;
  task_id: string;
  robot_id: string;
  bid_score: number;
  distance: number;
  battery: number;
  workload: number;
  result: 'winner' | 'rejected' | 'disqualified';
  timestamp: string;
}

export interface P2PMessageRecord {
  id?: number;
  sender_id: string;
  receiver_id: string;
  message_type: 'TASK_REQUEST' | 'TASK_BID' | 'TASK_ACCEPT' | 'TASK_REJECT' | 'TASK_COMPLETED' | 'PATH_REQUEST' | 'PATH_GRANTED' | 'WAIT' | 'PATH_RELEASE' | 'MOVE';
  task_id: string | null;
  payload: string;
  timestamp: string;
}

export interface TaskConflictRecord {
  id: string;
  task_id: string;
  contending_robots: string; // JSON array of robot IDs
  bids: string; // JSON array of BidDetail
  status: 'DETECTED' | 'RESOLVING' | 'RESOLVED';
  winner_id: string | null;
  resolution_log: string;
  timestamp: string;
}

export interface ResourceConflictRecord {
  id: string;
  resource_id: string;
  robot1_id: string;
  robot2_id: string;
  winner_id: string;
  waiting_robot_id: string;
  status: 'ACTIVE' | 'RESOLVED';
  reason: string;
  timestamp: string;
}

export interface CollisionRiskRecord {
  id: string;
  robot1_id: string;
  robot2_id: string;
  intersection_x: number;
  intersection_y: number;
  risk_type: 'too_close' | 'same_location' | 'same_path' | 'crossing_path';
  priority_robot: string;
  waiting_robot: string;
  status: 'DETECTED' | 'AVOIDING' | 'RESOLVED';
  details: string;
  timestamp: string;
}

export interface EventRecord {
  id?: number;
  event_type: string;
  robot_id: string | null;
  task_id: string | null;
  message: string;
  timestamp: string;
}

export interface DeadlockRecord {
  id: string;
  status: 'DETECTED' | 'RECOVERING' | 'RECOVERED';
  cause: string;
  robots_involved: string; // JSON array of robot IDs
  detected_at: string;
  recovery_started_at: string | null;
  recovered_at: string | null;
  recovery_robot: string | null;
  recovery_action: string | null;
}

export interface RobotDependencyRecord {
  id?: number;
  robot_id: string;
  waiting_for_robot: string;
  task_id: string | null;
  resource: string;
  status: 'active' | 'resolved';
  timestamp: string;
}

export class SimulationDatabase {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(dbPath: string = 'database.db') {
    this.dbPath = path.resolve(process.cwd(), dbPath);
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    this.db = new DatabaseSync(this.dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS robots (
        id TEXT PRIMARY KEY,
        group_id TEXT NOT NULL,
        x REAL NOT NULL,
        y REAL NOT NULL,
        target_x REAL,
        target_y REAL,
        battery REAL NOT NULL,
        status TEXT NOT NULL,
        current_task TEXT,
        speed REAL NOT NULL,
        tasks_completed INTEGER NOT NULL DEFAULT 0,
        failed INTEGER NOT NULL DEFAULT 0,
        total_distance REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        x REAL NOT NULL,
        y REAL NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        assigned_robot TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        winning_bid REAL
      );

      CREATE TABLE IF NOT EXISTS negotiations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        robot_id TEXT NOT NULL,
        bid_score REAL NOT NULL,
        distance REAL NOT NULL,
        battery REAL NOT NULL,
        workload REAL NOT NULL,
        result TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        robot_id TEXT,
        task_id TEXT,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deadlocks (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        cause TEXT NOT NULL,
        robots_involved TEXT NOT NULL,
        detected_at TEXT NOT NULL,
        recovery_started_at TEXT,
        recovered_at TEXT,
        recovery_robot TEXT,
        recovery_action TEXT
      );

      CREATE TABLE IF NOT EXISTS robot_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        robot_id TEXT NOT NULL,
        waiting_for_robot TEXT NOT NULL,
        task_id TEXT,
        resource TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS p2p_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id TEXT NOT NULL,
        receiver_id TEXT NOT NULL,
        message_type TEXT NOT NULL,
        task_id TEXT,
        payload TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS task_conflicts (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        contending_robots TEXT NOT NULL,
        bids TEXT NOT NULL,
        status TEXT NOT NULL,
        winner_id TEXT,
        resolution_log TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS resource_conflicts (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        robot1_id TEXT NOT NULL,
        robot2_id TEXT NOT NULL,
        winner_id TEXT NOT NULL,
        waiting_robot_id TEXT NOT NULL,
        status TEXT NOT NULL,
        reason TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collision_risks (
        id TEXT PRIMARY KEY,
        robot1_id TEXT NOT NULL,
        robot2_id TEXT NOT NULL,
        intersection_x REAL NOT NULL,
        intersection_y REAL NOT NULL,
        risk_type TEXT NOT NULL,
        priority_robot TEXT NOT NULL,
        waiting_robot TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_robots_status ON robots(status);
      CREATE INDEX IF NOT EXISTS idx_robots_group ON robots(group_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_negotiations_task ON negotiations(task_id);
      CREATE INDEX IF NOT EXISTS idx_dependencies_status ON robot_dependencies(status);
      CREATE INDEX IF NOT EXISTS idx_deadlocks_status ON deadlocks(status);
      CREATE INDEX IF NOT EXISTS idx_p2p_timestamp ON p2p_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_task_conflicts ON task_conflicts(timestamp);
      CREATE INDEX IF NOT EXISTS idx_collision_risks ON collision_risks(timestamp);
    `);

    // Verify if 500 robots and 20 tasks are present; if not, seed them
    const robotCountRow = this.db.prepare('SELECT COUNT(*) as count FROM robots').get() as { count: number };
    const taskCountRow = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number };

    if (robotCountRow.count < 500 || taskCountRow.count === 0) {
      this.seedData(true);
    }
  }

  public seedData(force: boolean = false, initialTaskCount: number = 20) {
    if (force) {
      this.db.exec(`
        DELETE FROM robots;
        DELETE FROM tasks;
        DELETE FROM negotiations;
        DELETE FROM events;
        DELETE FROM deadlocks;
        DELETE FROM robot_dependencies;
        DELETE FROM p2p_messages;
        DELETE FROM task_conflicts;
        DELETE FROM resource_conflicts;
        DELETE FROM collision_risks;
      `);
    }

    const now = new Date().toISOString();

    // 1. Seed exactly 500 robots divided into 4 groups (A, B, C, D) of 125 each, stationed at their group docking hubs
    const insertRobot = this.db.prepare(`
      INSERT INTO robots (id, group_id, x, y, target_x, target_y, battery, status, current_task, speed, tasks_completed, failed, total_distance)
      VALUES (?, ?, ?, ?, NULL, NULL, ?, 'idle', NULL, ?, 0, 0, 0)
    `);

    const groups = [
      { name: 'Group A', baseX: 170, baseY: 150 },
      { name: 'Group B', baseX: 730, baseY: 150 },
      { name: 'Group C', baseX: 170, baseY: 450 },
      { name: 'Group D', baseX: 730, baseY: 450 },
    ];

    for (let i = 1; i <= 500; i++) {
      const id = `R-${String(i).padStart(3, '0')}`;
      const groupIdx = Math.floor((i - 1) / 125);
      const group = groups[groupIdx] || groups[0];
      
      // Position robots neatly clustered in their group docking base
      const angle = (i % 125) * (2 * Math.PI / 125);
      const radius = 8 + ((i * 11) % 36);
      const x = Math.max(30, Math.min(870, Math.round(group.baseX + Math.cos(angle) * radius)));
      const y = Math.max(30, Math.min(570, Math.round(group.baseY + Math.sin(angle) * radius)));

      // Random initial battery between 50 and 100
      const battery = Math.round(50 + Math.random() * 50);
      const speed = Number((2.4 + Math.random() * 1.6).toFixed(1)); // 2.4 - 4.0 u/s

      insertRobot.run(id, group.name, x, y, battery, speed);
    }

    // 2. Seed initial tasks (default 20) distributed across the 2D arena
    const insertTask = this.db.prepare(`
      INSERT INTO tasks (id, x, y, priority, status, assigned_robot, created_at, completed_at, winning_bid)
      VALUES (?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)
    `);

    for (let i = 1; i <= initialTaskCount; i++) {
      const id = `T-${String(i).padStart(3, '0')}`;
      // Spread across 900x600 coordinate grid avoiding directly inside group hubs
      const x = Math.round(70 + Math.random() * 760);
      const y = Math.round(70 + Math.random() * 460);
      
      // Weighted priority: 40% Medium, 30% Low, 20% High, 10% Critical
      const rand = Math.random();
      const priority = rand < 0.3 ? 'Low' : rand < 0.7 ? 'Medium' : rand < 0.9 ? 'High' : 'Critical';

      insertTask.run(id, x, y, priority, now);
    }

    // Initial event
    this.addEvent('simulation_reset', null, null, `Simulation initialized with 500 Robots stationed in 4 Group hubs and ${initialTaskCount} Tasks.`);
  }

  /**
   * Adds additional tasks on demand (e.g., 20 more if the user requests)
   */
  public addMoreTasks(count: number = 20): TaskRecord[] {
    const now = new Date().toISOString();
    const currentMaxRow = this.db.prepare(`
      SELECT id FROM tasks ORDER BY id DESC LIMIT 1
    `).get() as { id: string } | undefined;

    let nextIndex = 1;
    if (currentMaxRow?.id) {
      const match = currentMaxRow.id.match(/T-(\d+)/);
      if (match) {
        nextIndex = parseInt(match[1], 10) + 1;
      }
    }

    const insertTask = this.db.prepare(`
      INSERT INTO tasks (id, x, y, priority, status, assigned_robot, created_at, completed_at, winning_bid)
      VALUES (?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)
    `);

    const newTasks: TaskRecord[] = [];

    for (let i = 0; i < count; i++) {
      const id = `T-${String(nextIndex + i).padStart(3, '0')}`;
      const x = Math.round(70 + Math.random() * 760);
      const y = Math.round(70 + Math.random() * 460);
      const rand = Math.random();
      const priority: 'Low' | 'Medium' | 'High' | 'Critical' = 
        rand < 0.3 ? 'Low' : rand < 0.7 ? 'Medium' : rand < 0.9 ? 'High' : 'Critical';

      insertTask.run(id, x, y, priority, now);
      newTasks.push({
        id,
        x,
        y,
        priority,
        status: 'pending',
        assigned_robot: null,
        created_at: now,
        completed_at: null,
        winning_bid: null,
      });
    }

    this.addEvent(
      'tasks_added',
      null,
      null,
      `Generated ${count} additional tasks on demand (${newTasks[0]?.id} - ${newTasks[newTasks.length - 1]?.id}). Total tasks now: ${this.getTasks().length}.`
    );

    return newTasks;
  }

  public getRobots(filter?: { status?: string; group?: string; limit?: number }): RobotRecord[] {
    let sql = 'SELECT * FROM robots';
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.status && filter.status !== 'all') {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.group && filter.group !== 'all') {
      conditions.push('group_id = ?');
      params.push(filter.group);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY id ASC';

    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    return this.db.prepare(sql).all(...params) as unknown as RobotRecord[];
  }

  public getRobotById(id: string): RobotRecord | null {
    const row = this.db.prepare('SELECT * FROM robots WHERE id = ?').get(id);
    return row ? (row as unknown as RobotRecord) : null;
  }

  public getTasks(filter?: { status?: string; priority?: string; limit?: number }): TaskRecord[] {
    let sql = 'SELECT * FROM tasks';
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (filter?.status && filter.status !== 'all') {
      conditions.push('status = ?');
      params.push(filter.status);
    }
    if (filter?.priority && filter.priority !== 'all') {
      conditions.push('priority = ?');
      params.push(filter.priority);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY id ASC';

    if (filter?.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    return this.db.prepare(sql).all(...params) as unknown as TaskRecord[];
  }

  public getTaskById(id: string): TaskRecord | null {
    const row = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return row ? (row as unknown as TaskRecord) : null;
  }

  public updateRobot(id: string, updates: Partial<RobotRecord>) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE robots SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  public updateTask(id: string, updates: Partial<TaskRecord>) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  public addNegotiation(record: NegotiationRecord) {
    const stmt = this.db.prepare(`
      INSERT INTO negotiations (task_id, robot_id, bid_score, distance, battery, workload, result, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.task_id,
      record.robot_id,
      record.bid_score,
      record.distance,
      record.battery,
      record.workload,
      record.result,
      record.timestamp
    );
  }

  public addEvent(eventType: string, robotId: string | null, taskId: string | null, message: string) {
    const stmt = this.db.prepare(`
      INSERT INTO events (event_type, robot_id, task_id, message, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(eventType, robotId, taskId, message, new Date().toISOString());
  }

  public getNegotiationLog(limit: number = 30): NegotiationRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM negotiations ORDER BY id DESC LIMIT ?
    `).all(limit);
    return rows as unknown as NegotiationRecord[];
  }

  public getEvents(limit: number = 40): EventRecord[] {
    const rows = this.db.prepare(`
      SELECT * FROM events ORDER BY id DESC LIMIT ?
    `).all(limit);
    return rows as unknown as EventRecord[];
  }

  public getStatistics() {
    const totalRobots = (this.db.prepare('SELECT COUNT(*) as count FROM robots').get() as { count: number }).count;
    const totalTasks = (this.db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;

    const idleRobots = (this.db.prepare("SELECT COUNT(*) as count FROM robots WHERE status = 'idle' AND failed = 0").get() as { count: number }).count;
    const busyRobots = (this.db.prepare("SELECT COUNT(*) as count FROM robots WHERE status IN ('moving', 'negotiating') AND failed = 0").get() as { count: number }).count;
    const failedRobots = (this.db.prepare("SELECT COUNT(*) as count FROM robots WHERE failed = 1 OR status = 'failed'").get() as { count: number }).count;

    const completedTasks = (this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get() as { count: number }).count;
    const pendingTasks = (this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'pending'").get() as { count: number }).count;
    const assignedTasks = (this.db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status IN ('assigned', 'in_progress')").get() as { count: number }).count;

    const totalNegotiations = (this.db.prepare("SELECT COUNT(*) as count FROM negotiations WHERE result = 'winner'").get() as { count: number }).count;

    // Groups breakdown
    const groupStats = this.db.prepare(`
      SELECT 
        group_id,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'idle' AND failed = 0 THEN 1 ELSE 0 END) as idle,
        SUM(CASE WHEN status IN ('moving', 'negotiating') AND failed = 0 THEN 1 ELSE 0 END) as busy,
        SUM(CASE WHEN failed = 1 OR status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM robots
      GROUP BY group_id
      ORDER BY group_id ASC
    `).all();

    // Battery distribution
    const batteryDist = {
      '80-100%': (this.db.prepare('SELECT COUNT(*) as count FROM robots WHERE battery >= 80').get() as { count: number }).count,
      '60-80%': (this.db.prepare('SELECT COUNT(*) as count FROM robots WHERE battery >= 60 AND battery < 80').get() as { count: number }).count,
      '40-60%': (this.db.prepare('SELECT COUNT(*) as count FROM robots WHERE battery >= 40 AND battery < 60').get() as { count: number }).count,
      '20-40%': (this.db.prepare('SELECT COUNT(*) as count FROM robots WHERE battery >= 20 AND battery < 40').get() as { count: number }).count,
      '0-20%': (this.db.prepare('SELECT COUNT(*) as count FROM robots WHERE battery < 20').get() as { count: number }).count,
    };

    // Priority breakdown for pending/assigned
    const priorityStats = this.db.prepare(`
      SELECT priority, COUNT(*) as count
      FROM tasks
      GROUP BY priority
    `).all();

    return {
      total_robots: totalRobots,
      total_tasks: totalTasks,
      idle_robots: idleRobots,
      busy_robots: busyRobots,
      failed_robots: failedRobots,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      assigned_tasks: assignedTasks,
      negotiations: totalNegotiations,
      groups: groupStats,
      battery_distribution: batteryDist,
      priority_distribution: priorityStats,
    };
  }

  // --- Deadlock Methods ---

  public addDeadlock(deadlock: DeadlockRecord) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO deadlocks (id, status, cause, robots_involved, detected_at, recovery_started_at, recovered_at, recovery_robot, recovery_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      deadlock.id,
      deadlock.status,
      deadlock.cause,
      deadlock.robots_involved,
      deadlock.detected_at,
      deadlock.recovery_started_at,
      deadlock.recovered_at,
      deadlock.recovery_robot,
      deadlock.recovery_action
    );
  }

  public updateDeadlock(id: string, updates: Partial<DeadlockRecord>) {
    const fields: string[] = [];
    const values: (string | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value as string | null);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE deadlocks SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...values);
  }

  public getDeadlocks(status?: string, limit: number = 30): DeadlockRecord[] {
    let sql = 'SELECT * FROM deadlocks';
    const params: string[] = [];
    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY detected_at DESC LIMIT ?';
    return this.db.prepare(sql).all(...params, limit) as unknown as DeadlockRecord[];
  }

  public getDeadlockById(id: string): DeadlockRecord | null {
    const row = this.db.prepare('SELECT * FROM deadlocks WHERE id = ?').get(id);
    return row ? (row as unknown as DeadlockRecord) : null;
  }

  public addDependency(dep: RobotDependencyRecord) {
    const stmt = this.db.prepare(`
      INSERT INTO robot_dependencies (robot_id, waiting_for_robot, task_id, resource, status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      dep.robot_id,
      dep.waiting_for_robot,
      dep.task_id,
      dep.resource,
      dep.status,
      dep.timestamp
    );
  }

  public clearDependenciesForRobot(robotId: string) {
    this.db.prepare(`
      UPDATE robot_dependencies SET status = 'resolved' WHERE (robot_id = ? OR waiting_for_robot = ?) AND status = 'active'
    `).run(robotId, robotId);
  }

  public getActiveDependencies(): RobotDependencyRecord[] {
    return this.db.prepare(`
      SELECT * FROM robot_dependencies WHERE status = 'active' ORDER BY id ASC
    `).all() as unknown as RobotDependencyRecord[];
  }

  public clearActiveDependencies() {
    this.db.exec("UPDATE robot_dependencies SET status = 'resolved' WHERE status = 'active'");
  }

  public getDeadlockMetrics() {
    const totalDetected = (this.db.prepare('SELECT COUNT(*) as count FROM deadlocks').get() as { count: number }).count;
    const activeDeadlocks = (this.db.prepare("SELECT COUNT(*) as count FROM deadlocks WHERE status IN ('DETECTED', 'RECOVERING')").get() as { count: number }).count;
    const recoveredDeadlocks = (this.db.prepare("SELECT COUNT(*) as count FROM deadlocks WHERE status = 'RECOVERED'").get() as { count: number }).count;

    // Average recovery time (seconds)
    const times = this.db.prepare(`
      SELECT detected_at, recovered_at FROM deadlocks WHERE status = 'RECOVERED' AND recovered_at IS NOT NULL
    `).all() as { detected_at: string; recovered_at: string }[];

    let avgRecoveryTime = 0;
    if (times.length > 0) {
      const sum = times.reduce((acc, curr) => {
        const diff = (new Date(curr.recovered_at).getTime() - new Date(curr.detected_at).getTime()) / 1000;
        return acc + Math.max(0, diff);
      }, 0);
      avgRecoveryTime = Number((sum / times.length).toFixed(1));
    }

    // Unique robots involved in deadlocks
    const allRecords = this.db.prepare('SELECT robots_involved FROM deadlocks').all() as { robots_involved: string }[];
    const robotSet = new Set<string>();
    for (const r of allRecords) {
      try {
        const arr = JSON.parse(r.robots_involved);
        if (Array.isArray(arr)) arr.forEach(id => robotSet.add(id));
      } catch {
        // ignore
      }
    }

    // Tasks reallocated count from events
    const reallocatedCount = (this.db.prepare("SELECT COUNT(*) as count FROM events WHERE event_type LIKE '%deadlock%realloc%' OR message LIKE '%returned to negotiation%'").get() as { count: number }).count;

    return {
      deadlocks_detected: totalDetected,
      active_deadlocks: activeDeadlocks,
      recovered_deadlocks: recoveredDeadlocks,
      avg_recovery_time_sec: avgRecoveryTime,
      robots_involved_count: robotSet.size,
      tasks_reallocated: reallocatedCount,
    };
  }

  // --- P2P Messaging Methods ---
  public addP2PMessage(msg: {
    sender_id: string;
    receiver_id: string;
    message_type: 'TASK_REQUEST' | 'TASK_BID' | 'TASK_ACCEPT' | 'TASK_REJECT' | 'TASK_COMPLETED' | 'PATH_REQUEST' | 'PATH_GRANTED' | 'WAIT' | 'PATH_RELEASE' | 'MOVE';
    task_id: string | null;
    payload: any;
    timestamp?: string;
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO p2p_messages (sender_id, receiver_id, message_type, task_id, payload, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.sender_id,
      msg.receiver_id,
      msg.message_type,
      msg.task_id,
      typeof msg.payload === 'string' ? msg.payload : JSON.stringify(msg.payload),
      msg.timestamp || new Date().toISOString()
    );
  }

  public getP2PMessages(limit: number = 50): P2PMessageRecord[] {
    return this.db.prepare(`
      SELECT * FROM p2p_messages ORDER BY id DESC LIMIT ?
    `).all(limit) as unknown as P2PMessageRecord[];
  }

  // --- Task & Resource Conflict Methods ---
  public addTaskConflict(conflict: TaskConflictRecord) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO task_conflicts (id, task_id, contending_robots, bids, status, winner_id, resolution_log, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      conflict.id,
      conflict.task_id,
      conflict.contending_robots,
      conflict.bids,
      conflict.status,
      conflict.winner_id,
      conflict.resolution_log,
      conflict.timestamp
    );
  }

  public getTaskConflicts(limit: number = 20): TaskConflictRecord[] {
    return this.db.prepare(`
      SELECT * FROM task_conflicts ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as unknown as TaskConflictRecord[];
  }

  public addResourceConflict(conflict: ResourceConflictRecord) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO resource_conflicts (id, resource_id, robot1_id, robot2_id, winner_id, waiting_robot_id, status, reason, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      conflict.id,
      conflict.resource_id,
      conflict.robot1_id,
      conflict.robot2_id,
      conflict.winner_id,
      conflict.waiting_robot_id,
      conflict.status,
      conflict.reason,
      conflict.timestamp
    );
  }

  public getResourceConflicts(limit: number = 20): ResourceConflictRecord[] {
    return this.db.prepare(`
      SELECT * FROM resource_conflicts ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as unknown as ResourceConflictRecord[];
  }

  // --- Collision Risk Methods ---
  public addCollisionRisk(risk: CollisionRiskRecord) {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO collision_risks (id, robot1_id, robot2_id, intersection_x, intersection_y, risk_type, priority_robot, waiting_robot, status, details, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      risk.id,
      risk.robot1_id,
      risk.robot2_id,
      risk.intersection_x,
      risk.intersection_y,
      risk.risk_type,
      risk.priority_robot,
      risk.waiting_robot,
      risk.status,
      risk.details,
      risk.timestamp
    );
  }

  public updateCollisionRisk(id: string, updates: Partial<CollisionRiskRecord>) {
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id') {
        fields.push(`${key} = ?`);
        values.push(value as any);
      }
    }
    if (fields.length === 0) return;
    values.push(id);
    this.db.prepare(`UPDATE collision_risks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  public getCollisionRisks(limit: number = 30): CollisionRiskRecord[] {
    return this.db.prepare(`
      SELECT * FROM collision_risks ORDER BY timestamp DESC LIMIT ?
    `).all(limit) as unknown as CollisionRiskRecord[];
  }
}
