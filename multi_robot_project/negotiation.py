"""
Negotiation Engine implementing Contract Net Protocol & transparent scoring formula:
Bid Score = Distance Cost + Battery Cost + Workload Cost - Priority Benefit
"""

import math
from datetime import datetime

class NegotiationEngine:
    def __init__(self, w_dist=1.0, w_batt=1.0, w_work=0.8, w_prio=1.2):
        self.w_dist = w_dist
        self.w_batt = w_batt
        self.w_work = w_work
        self.w_prio = w_prio

    def get_priority_value(self, priority):
        priorities = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
        return priorities.get(priority, 1)

    def calculate_bid(self, robot, task):
        dx = robot['x'] - task['x']
        dy = robot['y'] - task['y']
        distance = math.sqrt(dx * dx + dy * dy)

        distance_cost = round((distance / 40.0) * self.w_dist, 2)
        battery_cost = round(((100.0 - robot['battery']) / 100.0 * 20.0) * self.w_batt, 2)
        workload_cost = round((robot['tasks_completed'] * 1.5) * self.w_work, 2)

        prio_val = self.get_priority_value(task['priority'])
        priority_benefit = round((prio_val * 3.0) * self.w_prio, 2)

        bid_score = round(distance_cost + battery_cost + workload_cost - priority_benefit, 2)

        return {
            'robot_id': robot['id'],
            'group_id': robot['group_id'],
            'distance': round(distance, 1),
            'battery': robot['battery'],
            'tasks_completed': robot['tasks_completed'],
            'distance_cost': distance_cost,
            'battery_cost': battery_cost,
            'workload_cost': workload_cost,
            'priority_benefit': priority_benefit,
            'bid_score': bid_score
        }

    def negotiate_task(self, conn, task, is_renegotiation=False):
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM robots WHERE status = 'idle' AND failed = 0 AND battery >= 15")
        eligible_robots = [dict(r) for r in cursor.fetchall()]

        if not eligible_robots:
            return None

        # Sort by distance and pick top 8 closest robots
        def dist_to_task(r):
            return math.hypot(r['x'] - task['x'], r['y'] - task['y'])

        eligible_robots.sort(key=dist_to_task)
        candidates = eligible_robots[:8]

        bids = [self.calculate_bid(r, task) for r in candidates]
        bids.sort(key=lambda b: b['bid_score'])
        winner = bids[0]

        now_str = datetime.utcnow().isoformat()

        for b in bids:
            result = 'winner' if b['robot_id'] == winner['robot_id'] else 'rejected'
            cursor.execute("""
                INSERT INTO negotiations (task_id, robot_id, bid_score, distance, battery, workload, result, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (task['id'], b['robot_id'], b['bid_score'], b['distance'], b['battery'], b['tasks_completed'], result, now_str))

        cursor.execute("""
            UPDATE robots SET status = 'moving', current_task = ?, target_x = ?, target_y = ?
            WHERE id = ?
        """, (task['id'], task['x'], task['y'], winner['robot_id']))

        cursor.execute("""
            UPDATE tasks SET status = 'in_progress', assigned_robot = ?, winning_bid = ?
            WHERE id = ?
        """, (winner['robot_id'], winner['bid_score'], task['id']))

        prefix = "🔄 [RE-NEGOTIATION]" if is_renegotiation else "⚡ [NEGOTIATION]"
        cursor.execute("""
            INSERT INTO events (event_type, robot_id, task_id, message, timestamp)
            VALUES (?, ?, ?, ?, ?)
        """, (
            'task_reassigned' if is_renegotiation else 'task_assigned',
            winner['robot_id'],
            task['id'],
            f"{prefix} Task {task['id']} awarded to {winner['robot_id']} (Bid: {winner['bid_score']})",
            now_str
        ))

        conn.commit()

        return {
            'task_id': task['id'],
            'winner_id': winner['robot_id'],
            'winner_score': winner['bid_score'],
            'bids': bids,
            'renegotiation': is_renegotiation
        }
