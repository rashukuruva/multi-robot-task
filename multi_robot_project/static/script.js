/**
 * Frontend Controller for Multi-Robot Task Negotiation
 */
let renderer;
let pollTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  renderer = new SimulationRenderer('simCanvas');

  // Button hooks
  document.getElementById('btn-start').addEventListener('click', startSimulation);
  document.getElementById('btn-pause').addEventListener('click', pauseSimulation);
  document.getElementById('btn-reset').addEventListener('click', resetSimulation);
  document.getElementById('btn-generate').addEventListener('click', generateTasks);
  document.getElementById('btn-assign').addEventListener('click', assignTasks);
  document.getElementById('btn-fail').addEventListener('click', simulateFailure);

  // Inspector hooks
  window.onRobotSelected = (r) => {
    document.querySelector('#robot-detail .placeholder-text').style.display = 'none';
    const info = document.getElementById('robot-info');
    info.style.display = 'block';
    document.getElementById('r-id').textContent = r.id;
    document.getElementById('r-group').textContent = r.group_id;
    document.getElementById('r-status').textContent = r.status.toUpperCase();
    document.getElementById('r-battery').textContent = r.battery;
    document.getElementById('r-task').textContent = r.current_task || 'None';
    document.getElementById('r-completed').textContent = r.tasks_completed;
  };

  window.onTaskSelected = (t) => {
    document.querySelector('#task-detail .placeholder-text').style.display = 'none';
    const info = document.getElementById('task-info');
    info.style.display = 'block';
    document.getElementById('t-id').textContent = t.id;
    document.getElementById('t-priority').textContent = t.priority;
    document.getElementById('t-status').textContent = t.status.toUpperCase();
    document.getElementById('t-robot').textContent = t.assigned_robot || 'Unassigned';
    document.getElementById('t-bid').textContent = t.winning_bid || 'Pending';
  };

  // Poll loop
  fetchState();
  pollTimer = setInterval(fetchState, 500);
});

async function fetchState() {
  try {
    const [statsRes, robotsRes, tasksRes, logRes] = await Promise.all([
      fetch('/api/statistics').then(r => r.json()),
      fetch('/api/robots').then(r => r.json()),
      fetch('/api/tasks').then(r => r.json()),
      fetch('/api/negotiation/log?limit=8').then(r => r.json())
    ]);

    if (statsRes.success) {
      const s = statsRes.statistics;
      document.getElementById('stat-total-robots').textContent = s.total_robots;
      document.getElementById('stat-total-tasks').textContent = s.total_tasks;
      document.getElementById('stat-idle-robots').textContent = s.idle_robots;
      document.getElementById('stat-busy-robots').textContent = s.busy_robots;
      document.getElementById('stat-failed-robots').textContent = s.failed_robots;
      document.getElementById('stat-completed-tasks').textContent = s.completed_tasks;
      document.getElementById('stat-pending-tasks').textContent = s.pending_tasks;
      document.getElementById('stat-negotiations').textContent = s.negotiations;
    }

    if (robotsRes.success && tasksRes.success) {
      // Pass all robots so idle robots are visible clustered in group docks, and active robots on field
      renderer.updateData(robotsRes.robots, tasksRes.tasks);
    }

    if (logRes.success && logRes.logs) {
      const logContainer = document.getElementById('log-stream');
      logContainer.innerHTML = logRes.logs.map(l => `
        <div class="log-entry">
          <strong>${l.task_id}</strong> → ${l.robot_id} (Bid: ${l.bid_score}) - ${l.result.toUpperCase()}
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

async function startSimulation() {
  await fetch('/api/simulation/start', { method: 'POST' });
}

async function pauseSimulation() {
  await fetch('/api/simulation/pause', { method: 'POST' });
}

async function resetSimulation() {
  await fetch('/api/simulation/reset', { method: 'POST' });
  fetchState();
}

async function generateTasks() {
  await fetch('/api/tasks/generate', { method: 'POST' });
  fetchState();
}

async function assignTasks() {
  await fetch('/api/negotiation/start', { method: 'POST' });
  fetchState();
}

async function simulateFailure() {
  await fetch('/api/robot/fail-random', { method: 'POST' });
  fetchState();
}
