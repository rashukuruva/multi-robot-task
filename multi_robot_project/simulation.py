"""
Simulation management for movement, task completion, and failure recovery.
"""

import math
from datetime import datetime
from database import get_db_connection
from negotiation import NegotiationEngine

class SimulationManager:
    def __init__(self):
        self.running = False
        self.speed = 1.0
        self.negotiation_engine = NegotiationEngine()

    def tick(self):
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT * FROM robots WHERE status = 'moving'")
        moving_robots = [dict(r) for r in cursor.fetchall()]

        completed_count = 0
        for r in moving_robots:
            if r['target_x'] is None or r['target_y'] is None or not r['current_task']:
                continue

            dx = r['target_x'] - r['x']
            dy = r['target_y'] - r['y']
            dist = math.hypot(dx, dy)
            step = r['speed'] * 2.5 * self.speed

            if dist <= max(4.0, step):
                # Arrived at task!
                now_str = datetime.utcnow().isoformat()
                cursor.execute("""
                    UPDATE tasks SET status = 'completed', completed_at = ? WHERE id = ?
                """, (now_str, r['current_task']))

                new_battery = max(5.0, round(r['battery'] - 0.5, 1))

                # Return robot position to its group home hub
                hubs = {
                    'Group A': {'x': 170, 'y': 150},
                    'Group B': {'x': 730, 'y': 150},
                    'Group C': {'x': 170, 'y': 450},
                    'Group D': {'x': 730, 'y': 450},
                }
                hub = hubs.get(r['group_id'], {'x': 170, 'y': 150})
                id_digits = ''.join(filter(str.isdigit, r['id']))
                id_num = int(id_digits) if id_digits else 1
                angle = (id_num % 125) * (2 * math.pi / 125)
                radius = 8 + ((id_num * 11) % 36)
                home_x = round(hub['x'] + math.cos(angle) * radius)
                home_y = round(hub['y'] + math.sin(angle) * radius)

                cursor.execute("""
                    UPDATE robots SET x = ?, y = ?, status = 'idle', current_task = NULL,
                    target_x = NULL, target_y = NULL, battery = ?, tasks_completed = tasks_completed + 1,
                    total_distance = total_distance + ? WHERE id = ?
                """, (home_x, home_y, new_battery, dist, r['id']))

                cursor.execute("""
                    INSERT INTO events (event_type, robot_id, task_id, message, timestamp)
                    VALUES ('task_completed', ?, ?, ?, ?)
                """, (r['id'], r['current_task'], f"✅ Task {r['current_task']} completed by {r['id']}. Returned to {r['group_id']} base.", now_str))

                completed_count += 1
            else:
                nx = r['x'] + (dx / dist) * step
                ny = r['y'] + (dy / dist) * step
                new_battery = max(5.0, round(r['battery'] - 0.02 * step, 2))
                cursor.execute("""
                    UPDATE robots SET x = ?, y = ?, battery = ?, total_distance = total_distance + ? WHERE id = ?
                """, (round(nx, 2), round(ny, 2), new_battery, step, r['id']))

        # Auto negotiate tasks if running and active tasks < 25
        cursor.execute("SELECT COUNT(*) FROM robots WHERE status = 'moving'")
        active_count = cursor.fetchone()[0]

        if self.running and active_count < 25:
            cursor.execute("SELECT * FROM tasks WHERE status = 'pending' LIMIT 3")
            pending = [dict(t) for t in cursor.fetchall()]
            for task in pending:
                self.negotiation_engine.negotiate_task(conn, task, False)

        conn.commit()
        conn.close()
        return completed_count

    def simulate_failure(self, robot_id=None):
        conn = get_db_connection()
        cursor = conn.cursor()

        if robot_id:
            cursor.execute("SELECT * FROM robots WHERE id = ?", (robot_id,))
            target = cursor.fetchone()
        else:
            cursor.execute("SELECT * FROM robots WHERE status = 'moving' LIMIT 1")
            target = cursor.fetchone()
            if not target:
                cursor.execute("SELECT * FROM robots WHERE failed = 0 LIMIT 1")
                target = cursor.fetchone()

        if not target:
            conn.close()
            return None

        target = dict(target)
        task_id = target['current_task']
        now_str = datetime.utcnow().isoformat()

        # Mark failed
        cursor.execute("""
            UPDATE robots SET status = 'failed', failed = 1, current_task = NULL, target_x = NULL, target_y = NULL
            WHERE id = ?
        """, (target['id'],))

        cursor.execute("""
            INSERT INTO events (event_type, robot_id, task_id, message, timestamp)
            VALUES ('robot_failed', ?, ?, ?, ?)
        """, (target['id'], task_id, f"⚠️ CRITICAL: Robot {target['id']} failed!", now_str))

        reallocation = None
        if task_id:
            cursor.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            task = dict(cursor.fetchone())
            cursor.execute("UPDATE tasks SET status = 'pending', assigned_robot = NULL WHERE id = ?", (task_id,))
            reallocation = self.negotiation_engine.negotiate_task(conn, task, is_renegotiation=True)

        conn.commit()
        conn.close()
        return {'failed_robot': target, 'interrupted_task': task_id, 'reallocation': reallocation}
