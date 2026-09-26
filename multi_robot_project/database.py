"""
Database module for Multi-Robot Task Negotiation System.
Implements SQLite storage for 500 robots, 600 tasks, negotiations, and event logging.
"""

import sqlite3
import os
import random
import math
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'database.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(force_reset=False):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
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
    """)

    cursor.execute("SELECT COUNT(*) FROM robots")
    robot_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tasks")
    task_count = cursor.fetchone()[0]

    if force_reset or robot_count < 500 or task_count != 20:
        seed_data(conn)

    conn.commit()
    conn.close()

def seed_data(conn, task_count=20):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM robots")
    cursor.execute("DELETE FROM tasks")
    cursor.execute("DELETE FROM negotiations")
    cursor.execute("DELETE FROM events")

    groups = [
        {'name': 'Group A', 'baseX': 170, 'baseY': 150},
        {'name': 'Group B', 'baseX': 730, 'baseY': 150},
        {'name': 'Group C', 'baseX': 170, 'baseY': 450},
        {'name': 'Group D', 'baseX': 730, 'baseY': 450}
    ]

    # Seed 500 robots (125 in each of the 4 groups) stationed in group docks
    for i in range(1, 501):
        robot_id = f"R-{str(i).zfill(3)}"
        grp_idx = (i - 1) // 125
        grp = groups[grp_idx]

        angle = (i % 125) * (2 * math.pi / 125)
        radius = 8 + ((i * 11) % 36)
        x = max(30, min(870, round(grp['baseX'] + math.cos(angle) * radius)))
        y = max(30, min(570, round(grp['baseY'] + math.sin(angle) * radius)))

        battery = round(random.uniform(50.0, 100.0), 1)
        speed = round(random.uniform(2.4, 4.0), 1)

        cursor.execute("""
            INSERT INTO robots (id, group_id, x, y, target_x, target_y, battery, status, current_task, speed, tasks_completed, failed, total_distance)
            VALUES (?, ?, ?, ?, NULL, NULL, ?, 'idle', NULL, ?, 0, 0, 0)
        """, (robot_id, grp['name'], x, y, battery, speed))

    # Seed 20 tasks
    now_str = datetime.utcnow().isoformat()
    for i in range(1, task_count + 1):
        task_id = f"T-{str(i).zfill(3)}"
        x = round(random.uniform(70, 830))
        y = round(random.uniform(70, 530))

        r = random.random()
        priority = 'Low' if r < 0.3 else 'Medium' if r < 0.7 else 'High' if r < 0.9 else 'Critical'

        cursor.execute("""
            INSERT INTO tasks (id, x, y, priority, status, assigned_robot, created_at, completed_at, winning_bid)
            VALUES (?, ?, ?, ?, 'pending', NULL, ?, NULL, NULL)
        """, (task_id, x, y, priority, now_str))

    cursor.execute("""
        INSERT INTO events (event_type, robot_id, task_id, message, timestamp)
        VALUES ('simulation_init', NULL, NULL, 'Initialized database with 500 robots in 4 group hubs and 20 tasks.', ?)
    """, (now_str,))
