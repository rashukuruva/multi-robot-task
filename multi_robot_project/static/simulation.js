/**
 * 2D Simulation Canvas Renderer for Multi-Robot System
 */
class SimulationRenderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.robots = [];
    this.tasks = [];
    this.selectedRobot = null;
    this.selectedTask = null;

    this.groupHubs = [
      { name: 'Group A', x: 160, y: 150 },
      { name: 'Group B', x: 740, y: 150 },
      { name: 'Group C', x: 160, y: 450 },
      { name: 'Group D', x: 740, y: 450 },
    ];

    this.canvas.addEventListener('click', (e) => this.handleClick(e));
  }

  updateData(robots, tasks) {
    this.robots = robots;
    this.tasks = tasks;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw Grid
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvas.width, y);
      ctx.stroke();
    }

    // Draw Group Hubs (representing the 125 robots per hub)
    for (const hub of this.groupHubs) {
      ctx.beginPath();
      ctx.arc(hub.x, hub.y, 45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.fill();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hub.name, hub.x, hub.y - 48);
      ctx.fillText('125 Robots Hub Base', hub.x, hub.y + 54);
    }

    // Draw Tasks (📦 delivery box emojis)
    for (const task of this.tasks) {
      if (task.status === 'completed') continue; // keep canvas clean
      ctx.save();
      ctx.font = '13px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📦', task.x, task.y);
      ctx.restore();
    }

    // Draw Robots: idle remain clustered in group docks as tiny 🤖, active navigate to tasks
    for (const robot of this.robots) {
      if (robot.status === 'moving' && robot.target_x && robot.target_y) {
        // Draw connecting line: Robot R-XXX ───────────► Task T-YYY
        ctx.beginPath();
        ctx.moveTo(robot.x, robot.y);
        ctx.lineTo(robot.target_x, robot.target_y);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // If idle, render as neat small robot emoji inside group
      if (robot.status === 'idle') {
        ctx.save();
        ctx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.85;
        ctx.fillText('🤖', robot.x, robot.y);
        ctx.restore();
        continue;
      }

      // Draw active robot with status ring and 🤖 emoji
      let statusColor = '#94a3b8';
      if (robot.status === 'failed') statusColor = '#ef4444';
      else if (robot.status === 'moving') statusColor = '#38bdf8';
      else if (robot.status === 'negotiating') statusColor = '#f59e0b';

      ctx.beginPath();
      ctx.arc(robot.x, robot.y, 9, 0, Math.PI * 2);
      ctx.fillStyle = `${statusColor}33`;
      ctx.fill();
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.save();
      ctx.font = '13px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤖', robot.x, robot.y);
      ctx.restore();

      // Label if selected
      if (this.selectedRobot && this.selectedRobot.id === robot.id) {
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText(robot.id, robot.x, robot.y - 14);
      }
    }
  }

  handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check clicked robot
    for (const r of this.robots) {
      const dist = Math.hypot(r.x - clickX, r.y - clickY);
      if (dist <= 15) {
        this.selectedRobot = r;
        if (window.onRobotSelected) window.onRobotSelected(r);
        this.render();
        return;
      }
    }

    // Check clicked task
    for (const t of this.tasks) {
      const dist = Math.hypot(t.x - clickX, t.y - clickY);
      if (dist <= 12) {
        this.selectedTask = t;
        if (window.onTaskSelected) window.onTaskSelected(t);
        this.render();
        return;
      }
    }
  }
}
