export interface Robot {
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

export interface Task {
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

export interface NegotiationLog {
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

export interface EventLog {
  id?: number;
  event_type: string;
  robot_id: string | null;
  task_id: string | null;
  message: string;
  timestamp: string;
}

export interface GroupStat {
  group_id: string;
  total: number;
  idle: number;
  busy: number;
  failed: number;
}

export interface Statistics {
  total_robots: number;
  total_tasks: number;
  idle_robots: number;
  busy_robots: number;
  failed_robots: number;
  completed_tasks: number;
  pending_tasks: number;
  assigned_tasks: number;
  negotiations: number;
  groups: GroupStat[];
  battery_distribution: {
    '80-100%': number;
    '60-80%': number;
    '40-60%': number;
    '20-40%': number;
    '0-20%': number;
  };
  priority_distribution: { priority: string; count: number }[];
}

export interface NegotiationWeights {
  w_dist: number;
  w_batt: number;
  w_work: number;
  w_prio: number;
}

export interface DeadlockRecord {
  id: string;
  status: 'DETECTED' | 'RECOVERING' | 'RECOVERED';
  cause: string;
  robots_involved: string;
  detected_at: string;
  recovery_started_at: string | null;
  recovered_at: string | null;
  recovery_robot: string | null;
  recovery_action: string | null;
}

export interface WaitForEdge {
  from: string;
  to: string;
  resource: string;
  taskId?: string | null;
}

export interface WaitForGraphData {
  nodes: { id: string; status: string; task: string | null }[];
  edges: WaitForEdge[];
  hasCycle: boolean;
  cycle: string[];
}

export interface DeadlockMetrics {
  deadlocks_detected: number;
  active_deadlocks: number;
  recovered_deadlocks: number;
  avg_recovery_time_sec: number;
  robots_involved_count: number;
  tasks_reallocated: number;
}

export interface DeadlockState {
  metrics: DeadlockMetrics;
  activeDeadlocks: DeadlockRecord[];
  latestDeadlock: DeadlockRecord | null;
  waitForGraph: WaitForGraphData;
  recoveryPolicy: 'lowest_priority' | 'lowest_battery' | 'least_task_progress' | 'shortest_alternative_route';
}

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

export interface P2PMessage {
  id?: number;
  sender_id: string;
  receiver_id: string;
  message_type: 'TASK_REQUEST' | 'TASK_BID' | 'TASK_ACCEPT' | 'TASK_REJECT' | 'TASK_COMPLETED' | 'PATH_REQUEST' | 'PATH_GRANTED' | 'WAIT' | 'PATH_RELEASE' | 'MOVE';
  task_id: string | null;
  payload: any;
  timestamp: string;
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

export interface TaskConflictRecord {
  id: string;
  task_id: string;
  contending_robots: string; // JSON array string
  bids: string; // JSON array string of P2PBid
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

export interface LiveStateResponse {
  success: boolean;
  simulation: {
    running: boolean;
    speed: number;
    targetConcurrentTasks: number;
  };
  statistics: Statistics;
  activeRobots: Robot[];
  activeTasks: Task[];
  recentLogs: NegotiationLog[];
  recentEvents: EventLog[];
  weights: NegotiationWeights;
  deadlock: DeadlockState;
  p2p?: {
    sessions: P2PNegotiationSession[];
    messages: P2PMessage[];
    latestSession: P2PNegotiationSession | null;
  };
  conflicts?: {
    taskConflicts: TaskConflictRecord[];
    resourceConflicts: ResourceConflictRecord[];
    latestTaskConflict: TaskConflictRecord | null;
    latestResourceConflict: ResourceConflictRecord | null;
  };
  collision?: {
    activeReservations: PathReservation[];
    recentRisks: CollisionRiskRecord[];
    recentArbitrations: CollisionArbitrationResult[];
    latestArbitration: CollisionArbitrationResult | null;
    corridors: CorridorZone[];
  };
}
