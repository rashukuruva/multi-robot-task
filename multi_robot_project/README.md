# 🤖 Multi-Robot Task Negotiation & 2D Simulation System

A full-stack autonomous multi-robot task negotiation and real-time 2D simulation system coordinating **500 robots and 600 tasks** in a dynamic environment with fault recovery, transparent scoring formulas, and live telemetry.

---

## 1. Project Objective

The purpose of this project is to demonstrate how a large swarm of 500 autonomous robots negotiates and distributes 600 tasks efficiently in a 2D environment using a Contract Net Protocol (CNP) variant. It showcases:
- Distributed decentralized contract auctioning.
- Multi-factor bid scoring (distance, battery level, workload balancing, priority weighting).
- Dynamic real-time execution in a 2D arena.
- Fault tolerance & autonomous task re-negotiation when robots fail.

---

## 2. Features

- **500 Robots & 600 Tasks in SQLite Database**: Complete relational schema with true records for every single robot and task.
- **Contract Net Protocol Negotiation**: Transparent cost minimization formula:
  $$\text{Bid Score} = \text{Distance Cost} + \text{Battery Cost} + \text{Workload Cost} - \text{Priority Benefit}$$
- **Fault Recovery & Re-negotiation**: Immediate reallocation of interrupted tasks when a robot fails or runs out of battery.
- **Fleet Grouping**: Logical division into Group A, Group B, Group C, and Group D (125 robots each) with docking base hubs.
- **Real-Time 2D Simulation Canvas**: Interactive viewport with animated vector paths, status rings, and heading orientation.
- **Comprehensive Analytics**: Fleet status, battery distribution histogram, and task completion timeline.
- **REST APIs**: Full suite of REST endpoints for simulation controls, telemetry, and manual override.

---

## 3. Technology Stack

### Frontend
- HTML5 Canvas for optimized 2D simulation
- Modern responsive dashboard UI
- Interactive inspection panels and charts

### Backend
- **Python / Flask** (in `multi_robot_project/`)
- **Node.js / Express & TypeScript** (powering the live web applet)
- **SQLite Database**: Relational database structure (`robots`, `tasks`, `negotiations`, `events`)

---

## 4. Negotiation Algorithm

When a task needs an assignee:
1. Eligible robots are queried: `status = 'idle'`, `failed = 0`, and `battery >= 15%`.
2. Candidate robots compute a bid score:
   - **Distance Cost**: $\frac{\text{Distance}}{40} \times w_{\text{dist}}$
   - **Battery Cost**: $\frac{100 - \text{Battery}}{100} \times 20 \times w_{\text{batt}}$
   - **Workload Cost**: $(\text{Tasks Completed} \times 1.5) \times w_{\text{work}}$
   - **Priority Benefit**: $(\text{Priority Level} \times 3.0) \times w_{\text{prio}}$
3. The robot with the **lowest valid Bid Score** wins the contract.
4. If a robot fails midway, its task is marked pending and immediately re-auctioned.

---

## 5. Database Structure

- `robots`: `id`, `group_id`, `x`, `y`, `target_x`, `target_y`, `battery`, `status`, `current_task`, `speed`, `tasks_completed`, `failed`, `total_distance`
- `tasks`: `id`, `x`, `y`, `priority`, `status`, `assigned_robot`, `created_at`, `completed_at`, `winning_bid`
- `negotiations`: `id`, `task_id`, `robot_id`, `bid_score`, `distance`, `battery`, `workload`, `result`, `timestamp`
- `events`: `id`, `event_type`, `robot_id`, `task_id`, `message`, `timestamp`
- `deadlocks`: `id`, `status`, `cause`, `robots_involved`, `detected_at`, `recovery_started_at`, `recovered_at`, `recovery_robot`, `recovery_action`
- `robot_dependencies`: `id`, `robot_id`, `waiting_for_robot`, `task_id`, `resource`, `status`, `timestamp`

---

## 6. Deadlock Detection & Recovery (Sections 31–44)

The system includes a complete autonomous Deadlock Detection and Recovery engine:
- **Wait-For Graph**: Dynamic directed graph tracking robot-to-robot waiting states and resource contentions.
- **DFS Cycle Detection**: O(V + E) cycle traversal detecting circular waiting (e.g., $R_1 \to R_2 \to R_3 \to R_1$).
- **6-Step Automated Recovery**:
  1. *Identify Cycle*: Extract all robots participating in the dependency cycle.
  2. *Select Yield Candidate*: Configurable policy (`lowest_priority`, `lowest_battery`, `least_task_progress`, `shortest_alternative_route`).
  3. *Release Reservations*: Free corridor route and mutex locks.
  4. *Recalculate Route*: Guide yielding robot to a safe holding waypoint.
  5. *Re-Negotiate Task*: Task is returned to open Contract Net auction for bids by available fleet.
  6. *Resume Simulation*: Remaining robots proceed without collision or starvation.
- **Live APIs**:
  - `GET /api/deadlocks`
  - `GET /api/deadlocks/active`
  - `GET /api/deadlocks/history`
  - `POST /api/deadlock/simulate`
  - `POST /api/deadlock/recover/<id>`
  - `GET /api/wait-for-graph`

---

## 7. Installation & Quickstart (Python Flask)

1. Clone or extract the repository:
   ```bash
   cd multi_robot_project
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the backend server:
   ```bash
   python app.py
   ```

4. Open the website:
   ```text
   http://127.0.0.1:5000
   ```

---

## 7. Demonstration Flow for Hackathons & Project Reviews

1. **Step 1: Initial State**:
   Observe **500 Total Robots** and **600 Total Tasks** stored in the database.
2. **Step 2: Start Simulation**:
   Click **"Start Simulation"**.
3. **Step 3: Autonomous Task Allocation**:
   Robots submit bids. The dashboard shows real-time bidding scores and winning robots.
4. **Step 4: Vector Navigation**:
   Selected robots navigate toward their targets with animated vector connecting lines (`Robot ──────────► Task`).
5. **Step 5: Completion**:
   When reaching targets, tasks complete, robot workload increments, and robots return to idle.
6. **Step 6: Simulate Failure**:
   Click **"Simulate Failure"**. A moving robot turns red, the task is dropped, and the autonomous engine immediately re-allocates the task to another robot!
