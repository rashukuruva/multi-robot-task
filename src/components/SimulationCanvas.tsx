import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Robot, Task, GroupStat, DeadlockState, PathReservation, CorridorZone, CollisionArbitrationResult, P2PNegotiationSession } from '../types.js';
import { ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, Radio, Compass, AlertTriangle, ShieldAlert, Sparkles, Navigation } from 'lucide-react';

interface SimulationCanvasProps {
  robots: Robot[];
  tasks: Task[];
  groupStats: GroupStat[];
  selectedRobot: Robot | null;
  selectedTask: Task | null;
  deadlockState?: DeadlockState;
  corridors?: CorridorZone[];
  reservations?: PathReservation[];
  latestArbitration?: CollisionArbitrationResult | null;
  latestP2PSession?: P2PNegotiationSession | null;
  onSelectRobot: (robot: Robot | null) => void;
  onSelectTask: (task: Task | null) => void;
  onSelectGroup: (groupId: string) => void;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({
  robots,
  tasks,
  groupStats,
  selectedRobot,
  selectedTask,
  deadlockState,
  corridors = [],
  reservations = [],
  latestArbitration,
  latestP2PSession,
  onSelectRobot,
  onSelectTask,
  onSelectGroup,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport transforms (Pan & Zoom)
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Visual toggles
  const [showPaths, setShowPaths] = useState<boolean>(true);
  const [showHubs, setShowHubs] = useState<boolean>(true);
  const [showCompleted, setShowCompleted] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showCorridors, setShowCorridors] = useState<boolean>(true);
  const [showP2PSignals, setShowP2PSignals] = useState<boolean>(true);
  const [showCollisions, setShowCollisions] = useState<boolean>(true);

  // Group Hub coordinates (Arena is 900 x 600)
  const groupHubs = [
    { id: 'Group A', name: 'Dock A (NW)', x: 170, y: 150, color: '#38bdf8' },
    { id: 'Group B', name: 'Dock B (NE)', x: 730, y: 150, color: '#a855f7' },
    { id: 'Group C', name: 'Dock C (SW)', x: 170, y: 450, color: '#34d399' },
    { id: 'Group D', name: 'Dock D (SE)', x: 730, y: 450, color: '#fb923c' },
  ];

  // Animation pulse offset for laser lines
  const pulseRef = useRef<number>(0);

  // Handle Canvas Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    pulseRef.current = (pulseRef.current + 0.3) % 24;

    ctx.save();
    // Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply pan & zoom
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // 1. Draw Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(51, 65, 85, 0.25)';
      ctx.lineWidth = 1;
      const step = 50;
      for (let x = 0; x <= 900; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 600);
        ctx.stroke();
      }
      for (let y = 0; y <= 600; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(900, y);
        ctx.stroke();
      }

      // Arena boundary line
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, 900, 600);
    }

    // 2. Draw Group Hubs (representing 125 robots per hub)
    if (showHubs) {
      for (const hub of groupHubs) {
        const stat = groupStats.find(g => g.group_id === hub.id);
        const idleCount = stat ? stat.idle : 125;
        const busyCount = stat ? stat.busy : 0;
        const failedCount = stat ? stat.failed : 0;

        // Outer pulsing ring
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 52, 0, Math.PI * 2);
        ctx.strokeStyle = `${hub.color}22`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 42, 0, Math.PI * 2);
        ctx.strokeStyle = `${hub.color}55`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hub Background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fill();

        // Hub Title
        ctx.fillStyle = hub.color;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hub.id, hub.x, hub.y - 48);

        // Group Telemetry
        ctx.font = '9px system-ui, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`${idleCount} Idle Fleet in Base`, hub.x, hub.y - 36);

        // Sub counters
        ctx.font = '8px monospace';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`BUSY:${busyCount}  FAIL:${failedCount}`, hub.x, hub.y + 48);
      }
    }

    // 2B. Draw Narrow Corridors (Shared Resources with mutual exclusion)
    if (showCorridors && corridors.length > 0) {
      for (const c of corridors) {
        const isOccupied = !!c.occupied_by;
        ctx.save();
        // Corridor boundary box
        ctx.fillStyle = isOccupied ? 'rgba(244, 63, 94, 0.12)' : 'rgba(56, 189, 248, 0.08)';
        ctx.strokeStyle = isOccupied ? 'rgba(244, 63, 94, 0.7)' : 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.roundRect(c.x, c.y, c.width, c.height, 6);
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);

        // Diagonal hatch lines inside corridor
        ctx.strokeStyle = isOccupied ? 'rgba(244, 63, 94, 0.15)' : 'rgba(56, 189, 248, 0.15)';
        ctx.lineWidth = 1;
        for (let ox = c.x + 8; ox < c.x + c.width + c.height; ox += 14) {
          ctx.beginPath();
          ctx.moveTo(ox, c.y);
          ctx.lineTo(ox - c.height, c.y + c.height);
          ctx.stroke();
        }

        // Corridor Label
        ctx.fillStyle = isOccupied ? '#f43f5e' : '#38bdf8';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.name.split(' ')[0] + ' ' + c.name.split(' ')[1], c.x + c.width / 2, c.y - 5);

        ctx.font = '7px monospace';
        ctx.fillStyle = isOccupied ? '#fda4af' : '#94a3b8';
        ctx.fillText(isOccupied ? `BUSY: ${c.occupied_by}` : 'CLEAR', c.x + c.width / 2, c.y + c.height + 10);
        ctx.restore();
      }
    }

    // 2C. Draw Active Collision Hazards & Reserved Intersections
    if (showCollisions) {
      // Reservations
      for (const res of reservations) {
        if (res.cleared) continue;
        ctx.save();
        // Pulsing hazard ring around intersection
        const ringRad = 16 + (pulseRef.current % 10);
        ctx.beginPath();
        ctx.arc(res.intersection_x, res.intersection_y, ringRad, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(res.intersection_x, res.intersection_y, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.35)';
        ctx.fill();
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fecdd3';
        ctx.fillText(`PATH RESERVED: ${res.reserved_by}`, res.intersection_x, res.intersection_y - 12);
        ctx.fillText(`WAIT: ${res.waiting_robot}`, res.intersection_x, res.intersection_y + 18);
        ctx.restore();
      }

      // Latest collision arbitration connection line
      if (latestArbitration && Date.now() - new Date(latestArbitration.timestamp).getTime() < 12000) {
        const r1 = robots.find(r => r.id === latestArbitration.robot1_id);
        const r2 = robots.find(r => r.id === latestArbitration.robot2_id);
        if (r1 && r2) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(r1.x, r1.y);
          ctx.lineTo(latestArbitration.intersection.x, latestArbitration.intersection.y);
          ctx.lineTo(r2.x, r2.y);
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -pulseRef.current;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      }
    }

    // 2D. Draw P2P Negotiation Wireless Waves from Task to Bidders
    if (showP2PSignals && latestP2PSession && Date.now() - new Date(latestP2PSession.timestamp).getTime() < 10000) {
      const taskObj = tasks.find(t => t.id === latestP2PSession.task_id);
      if (taskObj) {
        ctx.save();
        // Expanding wireless signal ripples around task
        const waveRad = 12 + ((Date.now() / 30) % 36);
        ctx.beginPath();
        ctx.arc(taskObj.x, taskObj.y, waveRad, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(168, 85, 247, ${Math.max(0.1, 1 - waveRad / 48)})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Radiate beams to candidate robots
        for (const cid of latestP2PSession.candidate_robots) {
          const candidate = robots.find(r => r.id === cid);
          if (candidate) {
            ctx.beginPath();
            ctx.moveTo(taskObj.x, taskObj.y);
            ctx.lineTo(candidate.x, candidate.y);
            ctx.strokeStyle = cid === latestP2PSession.winner_id ? 'rgba(168, 85, 247, 0.7)' : 'rgba(148, 163, 184, 0.35)';
            ctx.lineWidth = cid === latestP2PSession.winner_id ? 1.8 : 1.0;
            ctx.setLineDash([3, 4]);
            ctx.lineDashOffset = -pulseRef.current;
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
        ctx.restore();
      }
    }

    // 3. Draw Connecting Vector Lines: Robot ───────────► Task
    if (showPaths) {
      for (const robot of robots) {
        if (robot.status === 'moving' && robot.target_x != null && robot.target_y != null) {
          const isSelected = selectedRobot?.id === robot.id;
          
          ctx.beginPath();
          ctx.moveTo(robot.x, robot.y);
          ctx.lineTo(robot.target_x, robot.target_y);
          
          ctx.strokeStyle = isSelected 
            ? 'rgba(56, 189, 248, 0.9)' 
            : 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = isSelected ? 2.0 : 1.2;
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -pulseRef.current;
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw small arrow head or particle moving along the vector
          const dx = robot.target_x - robot.x;
          const dy = robot.target_y - robot.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) {
            const frac = ((Date.now() / 15) % 100) / 100;
            const px = robot.x + dx * frac;
            const py = robot.y + dy * frac;

            ctx.beginPath();
            ctx.arc(px, py, isSelected ? 3 : 2, 0, Math.PI * 2);
            ctx.fillStyle = isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.8)';
            ctx.fill();
          }
        }
      }
    }

    // 3B. Section 35: DEADLOCK VISUALIZATION - Draw Directed Wait-For Dependency Arrows
    const edges = deadlockState?.waitForGraph?.edges || [];
    const cycleRobots = new Set<string>(deadlockState?.waitForGraph?.cycle || []);
    const activeDeadlockRobots = new Set<string>();
    if (deadlockState?.latestDeadlock && deadlockState.latestDeadlock.status !== 'RECOVERED') {
      try {
        const inv = JSON.parse(deadlockState.latestDeadlock.robots_involved);
        if (Array.isArray(inv)) inv.forEach(id => activeDeadlockRobots.add(id));
      } catch {
        // ignore
      }
    }

    if (edges.length > 0) {
      for (const edge of edges) {
        const fromRobot = robots.find(r => r.id === edge.from);
        const toRobot = robots.find(r => r.id === edge.to);
        if (fromRobot && toRobot) {
          const inCycle = cycleRobots.has(edge.from) && cycleRobots.has(edge.to);
          
          // Draw curved directed arrow from -> to
          const midX = (fromRobot.x + toRobot.x) / 2;
          const midY = (fromRobot.y + toRobot.y) / 2;
          // Offset control point to curve arrow
          const dx = toRobot.x - fromRobot.x;
          const dy = toRobot.y - fromRobot.y;
          const dist = Math.hypot(dx, dy);
          const curvature = 24;
          const ctrlX = midX - (dy / (dist || 1)) * curvature;
          const ctrlY = midY + (dx / (dist || 1)) * curvature;

          ctx.beginPath();
          ctx.moveTo(fromRobot.x, fromRobot.y);
          ctx.quadraticCurveTo(ctrlX, ctrlY, toRobot.x, toRobot.y);
          
          ctx.strokeStyle = inCycle ? 'rgba(249, 115, 22, 0.95)' : 'rgba(239, 68, 68, 0.8)';
          ctx.lineWidth = inCycle ? 2.5 : 1.8;
          ctx.setLineDash([5, 4]);
          ctx.lineDashOffset = -pulseRef.current * 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          // Arrowhead at destination
          const arrowAngle = Math.atan2(toRobot.y - ctrlY, toRobot.x - ctrlX);
          ctx.save();
          ctx.translate(toRobot.x, toRobot.y);
          ctx.rotate(arrowAngle);
          ctx.beginPath();
          ctx.moveTo(-8, -5);
          ctx.lineTo(0, 0);
          ctx.lineTo(-8, 5);
          ctx.fillStyle = inCycle ? '#f97316' : '#ef4444';
          ctx.fill();
          ctx.restore();

          // Waiting resource badge along edge
          ctx.save();
          ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = inCycle ? 'WAIT-FOR (CYCLE)' : 'BLOCKED';
          const lw = ctx.measureText(label).width + 8;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.strokeStyle = inCycle ? '#f97316' : '#ef4444';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(ctrlX - lw / 2, ctrlY - 6, lw, 12, 3);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = inCycle ? '#fb923c' : '#f87171';
          ctx.fillText(label, ctrlX, ctrlY);
          ctx.restore();
        }
      }
    }

    // 4. Draw Tasks (📦 tiny delivery box emojis)
    for (const task of tasks) {
      if (task.status === 'completed' && !showCompleted) continue;

      const isSelected = selectedTask?.id === task.id;
      const isCompleted = task.status === 'completed';
      const isInProgress = task.status === 'in_progress' || task.status === 'assigned';

      // Priority indicator glow/tint
      let priorityRing = '#3b82f6';
      if (task.priority === 'Critical') priorityRing = '#ef4444';
      else if (task.priority === 'High') priorityRing = '#f97316';
      else if (task.priority === 'Medium') priorityRing = '#f59e0b';

      if (isCompleted) {
        ctx.save();
        ctx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.4;
        ctx.fillText('📦', task.x, task.y);
        ctx.restore();
        continue;
      }

      // Priority halo / In Progress pulsating ring under delivery box
      ctx.beginPath();
      ctx.arc(task.x, task.y, isInProgress ? 11 : 8.5, 0, Math.PI * 2);
      ctx.strokeStyle = isInProgress ? `${priorityRing}aa` : `${priorityRing}44`;
      ctx.lineWidth = isInProgress ? 1.5 : 1;
      if (isInProgress) {
        ctx.setLineDash([3, 3]);
        ctx.lineDashOffset = -pulseRef.current;
      }
      ctx.stroke();
      if (isInProgress) ctx.setLineDash([]);

      // Draw tiny delivery box emoji 📦
      ctx.save();
      ctx.font = `${isInProgress ? 14 : 12}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📦', task.x, task.y);
      ctx.restore();

      // Selected halo & badge
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(task.x, task.y, 16, 0, Math.PI * 2);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(task.id, task.x, task.y - 15);
      }
    }

    // 5. Draw All Robots: Idle stationed in group hub, Active out on tasks
    for (const robot of robots) {
      const isSelected = selectedRobot?.id === robot.id;
      const isIdle = robot.status === 'idle';

      // If idle and stationed in group, render as a neat tiny robot emoji in group dock
      if (isIdle && !isSelected) {
        ctx.save();
        ctx.font = '10px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.85;
        ctx.fillText('🤖', robot.x, robot.y);
        ctx.restore();
        continue;
      }

      // Status Color coding for active/inspected robots
      const isDeadlocked = robot.status === 'blocked' || cycleRobots.has(robot.id) || activeDeadlockRobots.has(robot.id);
      const isWaiting = robot.status === 'waiting';
      let statusColor = '#94a3b8'; // Idle -> gray
      if (isDeadlocked) statusColor = '#f97316'; // Deadlock / Blocked -> bright orange/red
      else if (isWaiting) statusColor = '#eab308'; // Waiting for path -> amber/yellow
      else if (robot.status === 'failed') statusColor = '#ef4444'; // Failed -> red
      else if (robot.status === 'moving') statusColor = '#38bdf8'; // Moving -> blue
      else if (robot.status === 'negotiating') statusColor = '#f59e0b'; // Negotiating -> yellow
      else if (robot.status === 'completed') statusColor = '#10b981'; // Completed -> green

      // Outer battery ring indicator
      const batteryRadius = isSelected ? 13 : (isDeadlocked || isWaiting ? 12 : 10.5);
      ctx.beginPath();
      ctx.arc(robot.x, robot.y, batteryRadius, 0, Math.PI * 2);
      ctx.strokeStyle = isDeadlocked ? 'rgba(249, 115, 22, 0.9)' : (isWaiting ? 'rgba(234, 179, 8, 0.9)' : 'rgba(51, 65, 85, 0.5)');
      ctx.lineWidth = isDeadlocked || isWaiting ? 2.2 : 1.5;
      ctx.stroke();

      // Battery fill arc
      const battAngle = (robot.battery / 100) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(robot.x, robot.y, batteryRadius, -Math.PI / 2, -Math.PI / 2 + battAngle);
      ctx.strokeStyle = isDeadlocked ? 'rgba(249, 115, 22, 1)' : (isWaiting ? 'rgba(234, 179, 8, 1)' : (robot.battery > 40 ? 'rgba(52, 211, 153, 0.9)' : 'rgba(239, 68, 68, 0.9)'));
      ctx.lineWidth = isDeadlocked || isWaiting ? 2.4 : 1.8;
      ctx.stroke();

      // Active status glowing background ring
      ctx.beginPath();
      ctx.arc(robot.x, robot.y, isDeadlocked || isWaiting ? 11 : 8.5, 0, Math.PI * 2);
      ctx.fillStyle = isDeadlocked ? 'rgba(249, 115, 22, 0.28)' : (isWaiting ? 'rgba(234, 179, 8, 0.28)' : `${statusColor}25`);
      ctx.fill();
      ctx.strokeStyle = statusColor;
      ctx.lineWidth = isDeadlocked || isWaiting ? 2 : 1.2;
      ctx.stroke();

      // If deadlocked, draw pulsing warning beacon
      if (isDeadlocked) {
        const pingRadius = 14 + (pulseRef.current % 12);
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, pingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label above robot
        ctx.save();
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fed7aa';
        ctx.fillText(`⚠ ${robot.id}`, robot.x, robot.y - 14);
        ctx.restore();
      }

      // If waiting for path / resource clearance, draw amber beacon with WAIT label
      if (isWaiting) {
        const pingRadius = 14 + (pulseRef.current % 10);
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, pingRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.save();
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fde047';
        ctx.fillText(`WAIT: ${robot.id}`, robot.x, robot.y - 14);
        ctx.restore();
      }

      // Draw tiny robot emoji 🤖
      ctx.save();
      ctx.font = `${isSelected ? 15 : 13}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤖', robot.x, robot.y);
      ctx.restore();

      // Direction heading indicator if moving
      if (robot.status === 'moving' && robot.target_x != null && robot.target_y != null) {
        const angle = Math.atan2(robot.target_y - robot.y, robot.target_x - robot.x);
        ctx.save();
        ctx.translate(robot.x, robot.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(isSelected ? 9 : 8, 0);
        ctx.lineTo(isSelected ? 4 : 3, -3);
        ctx.lineTo(isSelected ? 5 : 4, 0);
        ctx.lineTo(isSelected ? 4 : 3, 3);
        ctx.closePath();
        ctx.fillStyle = '#38bdf8';
        ctx.fill();
        ctx.restore();
      }

      // If failed, draw pulsing red alarm wave
      if (robot.status === 'failed') {
        const alarmSize = 14 + (pulseRef.current % 10);
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, alarmSize, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('!', robot.x, robot.y + 3);
      }

      // Selected Robot Label & Info Overlay
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(robot.x, robot.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.stroke();

        // High visibility badge callout
        const badgeWidth = 96;
        const badgeHeight = 44;
        const bx = Math.min(800, Math.max(10, robot.x - badgeWidth / 2));
        const by = robot.y - 58 < 10 ? robot.y + 24 : robot.y - 58;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(bx, by, badgeWidth, badgeHeight, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Robot ${robot.id}`, bx + 8, by + 13);

        ctx.font = '8px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`Bat: ${robot.battery}%`, bx + 8, by + 25);
        ctx.fillText(`Task: ${robot.current_task || 'None'}`, bx + 8, by + 37);
      }
    }

    ctx.restore();
  }, [
    robots,
    tasks,
    groupStats,
    selectedRobot,
    selectedTask,
    deadlockState,
    zoom,
    pan,
    showPaths,
    showHubs,
    showCompleted,
    showGrid,
    showCorridors,
    showP2PSignals,
    showCollisions,
    corridors,
    reservations,
    latestArbitration,
    latestP2PSession,
  ]);

  // Continuous animation frame loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      render();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [render]);

  // Handle Mouse Click on Canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    // Transform click to arena coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const canvasX = clientX * scaleX;
    const canvasY = clientY * scaleY;

    const arenaX = (canvasX - pan.x) / zoom;
    const arenaY = (canvasY - pan.y) / zoom;

    // 1. Check if clicked near Group Hubs
    for (const hub of groupHubs) {
      if (Math.hypot(hub.x - arenaX, hub.y - arenaY) <= 45) {
        onSelectGroup(hub.id);
        return;
      }
    }

    // 2. Check if clicked on a Robot
    for (const robot of robots) {
      if (Math.hypot(robot.x - arenaX, robot.y - arenaY) <= 18) {
        onSelectRobot(robot);
        return;
      }
    }

    // 3. Check if clicked on a Task
    for (const task of tasks) {
      if (Math.hypot(task.x - arenaX, task.y - arenaY) <= 14) {
        onSelectTask(task);
        return;
      }
    }

    // If clicked empty space, deselect
    onSelectRobot(null);
    onSelectTask(null);
  };

  // Dragging / Pan Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { // Left click drag
      setIsDragging(false);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons === 1) {
      setIsDragging(true);
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(prev => Math.max(0.6, Math.min(2.8, prev * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div ref={containerRef} className="relative bg-slate-950 rounded-xl border-2 border-sky-300/90 overflow-hidden shadow-xl ring-4 ring-sky-100/80">
      {/* Top Toolbar / Canvas Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Arena Badge & Status Legend */}
        <div className="flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs pointer-events-auto shadow-md">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span>2D Arena (900 × 600)</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-2.5 text-[11px] text-slate-300">
            <span className="flex items-center gap-1">🤖 <span className="text-slate-300">Robots</span></span>
            <span className="flex items-center gap-1">📦 <span className="text-slate-300">Tasks</span></span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> Idle</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400"></span> Moving</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Negotiating</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span> Waiting</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span> Deadlocked</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Failed</span>
          </div>
        </div>

        {/* Viewport Control Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/85 backdrop-blur-md p-1 rounded-lg border border-slate-700/80 pointer-events-auto shadow-md">
          {/* Toggle Paths */}
          <button
            onClick={() => setShowPaths(!showPaths)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showPaths ? 'text-sky-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Vector Connecting Lines"
          >
            {showPaths ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          {/* Toggle Corridors */}
          <button
            onClick={() => setShowCorridors(!showCorridors)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showCorridors ? 'text-cyan-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Shared Narrow Corridors"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Toggle P2P Signals */}
          <button
            onClick={() => setShowP2PSignals(!showP2PSignals)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showP2PSignals ? 'text-purple-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Decentralized P2P Waves & Beams"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Collision Risk Radar */}
          <button
            onClick={() => setShowCollisions(!showCollisions)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showCollisions ? 'text-rose-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Real-Time Collision Hazard Markers"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Hubs */}
          <button
            onClick={() => setShowHubs(!showHubs)}
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              showHubs ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle Fleet Hub Docks"
          >
            <Radio className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In */}
          <button
            onClick={() => setZoom(prev => Math.min(2.8, prev * 1.15))}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => setZoom(prev => Math.max(0.6, prev * 0.85))}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={resetView}
            className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Reset Viewport"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Simulation Canvas */}
      <canvas
        ref={canvasRef}
        width={900}
        height={600}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        className="w-full aspect-[900/600] cursor-grab active:cursor-grabbing block"
      />

      {/* Deadlock Canvas Notification Watermark */}
      {deadlockState?.latestDeadlock && deadlockState.latestDeadlock.status !== 'RECOVERED' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 bg-amber-950/90 border border-amber-500/80 px-4 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-bounce">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-mono font-bold text-amber-200">
            CIRCULAR DEADLOCK [{deadlockState.latestDeadlock.id}]: Waiting Graph Cycle Active
          </span>
        </div>
      )}

      {/* Bottom Hint */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] text-slate-400/90 pointer-events-none">
        <span>Click any robot, task, or dock hub to inspect. Drag to pan, scroll to zoom.</span>
        <span className="font-mono tabular-nums">Zoom: {(zoom * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
};
