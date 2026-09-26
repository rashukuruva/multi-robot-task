import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { SimulationDatabase } from './server/database.js';
import { NegotiationEngine } from './server/negotiation.js';
import { SimulationManager } from './server/simulation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize DB, NegotiationEngine, SimulationManager
  const db = new SimulationDatabase();
  const negotiationEngine = new NegotiationEngine(db);
  const simulationManager = new SimulationManager(db, negotiationEngine);

  // REST API Routes

  // 1. Robots
  app.get('/api/robots', (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const group = req.query.group as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const robots = db.getRobots({ status, group, limit });
      res.json({ success: true, count: robots.length, robots });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/robots/:id', (req, res) => {
    try {
      const robot = db.getRobotById(req.params.id);
      if (!robot) {
        return res.status(404).json({ success: false, error: 'Robot not found' });
      }
      res.json({ success: true, robot });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Tasks
  app.get('/api/tasks', (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const priority = req.query.priority as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const tasks = db.getTasks({ status, priority, limit });
      res.json({ success: true, count: tasks.length, tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/tasks/:id', (req, res) => {
    try {
      const task = db.getTaskById(req.params.id);
      if (!task) {
        return res.status(404).json({ success: false, error: 'Task not found' });
      }
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Simulation Lifecycle Controls
  app.post('/api/simulation/start', (_req, res) => {
    try {
      simulationManager.start();
      res.json({ success: true, status: simulationManager.getStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/simulation/pause', (_req, res) => {
    try {
      simulationManager.pause();
      res.json({ success: true, status: simulationManager.getStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/simulation/reset', (_req, res) => {
    try {
      simulationManager.reset();
      res.json({ success: true, message: 'Simulation reset to 500 Robots and 50 Tasks.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/simulation/speed', (req, res) => {
    try {
      const { speed } = req.body;
      simulationManager.setSpeed(Number(speed) || 1.0);
      res.json({ success: true, status: simulationManager.getStatus() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Manual tick endpoint for client-driven animation
  app.post('/api/simulation/tick', (_req, res) => {
    try {
      const result = simulationManager.tick();
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Tasks Generation & Allocation
  app.post('/api/tasks/generate', (_req, res) => {
    try {
      db.seedData(true, 20);
      res.json({ success: true, message: '20 fresh tasks and 500 robots generated in SQLite database.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Generate 20 more tasks on demand only if user wants
  app.post('/api/tasks/add-more', (req, res) => {
    try {
      const count = req.body?.count ? Number(req.body.count) : 20;
      const newTasks = db.addMoreTasks(count);
      res.json({
        success: true,
        message: `Successfully generated ${newTasks.length} additional tasks. Total tasks: ${db.getTasks().length}.`,
        addedCount: newTasks.length,
        tasks: newTasks,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 1: P2P Negotiation Endpoints
  const p2pEngine = simulationManager.getP2PEngine();
  const collisionEngine = simulationManager.getCollisionEngine();

  app.post('/api/p2p/negotiate', (req, res) => {
    try {
      const taskId = req.body?.taskId as string | undefined;
      let task = taskId ? db.getTaskById(taskId) : null;
      if (!task) {
        const pending = db.getTasks({ status: 'pending', limit: 1 });
        task = pending.length > 0 ? pending[0] : null;
      }
      if (!task) {
        return res.status(404).json({ success: false, error: 'No pending task available for P2P negotiation' });
      }

      const session = p2pEngine.conductP2PNegotiation(task);
      if (!session) {
        return res.status(400).json({ success: false, error: 'No eligible idle robots available for peer auction' });
      }
      res.json({ success: true, session });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/p2p/messages', (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const messages = db.getP2PMessages(limit);
      res.json({ success: true, messages });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/p2p/sessions', (_req, res) => {
    try {
      const sessions = p2pEngine.getRecentSessions();
      res.json({ success: true, sessions });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 2: Conflict Management Endpoints
  app.post('/api/conflicts/simulate-task', (req, res) => {
    try {
      const taskId = req.body?.taskId as string | undefined;
      const conflict = p2pEngine.simulateTaskConflict(taskId);
      res.json({ success: true, conflict });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/conflicts/simulate-resource', (req, res) => {
    try {
      const corridor = req.body?.corridor || 'PATH A (Central Bottleneck)';
      const conflict = p2pEngine.simulateResourceConflict(corridor);
      res.json({ success: true, conflict });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/conflicts', (_req, res) => {
    try {
      const taskConflicts = p2pEngine.getActiveTaskConflicts();
      const resourceConflicts = p2pEngine.getActiveResourceConflicts();
      res.json({ success: true, taskConflicts, resourceConflicts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Feature 3: Collision Management Endpoints
  app.post('/api/collision/simulate', (_req, res) => {
    try {
      const arbitration = collisionEngine.simulateCollisionScenario();
      if (!arbitration) {
        return res.status(400).json({ success: false, error: 'Could not configure collision test scenario' });
      }
      res.json({ success: true, arbitration });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/collision/reservations', (_req, res) => {
    try {
      const reservations = collisionEngine.getActiveReservations();
      const corridors = collisionEngine.getCorridors();
      res.json({ success: true, reservations, corridors });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/collision/risks', (_req, res) => {
    try {
      const risks = db.getCollisionRisks(20);
      const arbitrations = collisionEngine.getRecentArbitrations();
      res.json({ success: true, risks, arbitrations });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/negotiation/start', (req, res) => {
    try {
      const batchSize = req.body.batchSize ? Number(req.body.batchSize) : 4;
      const results = negotiationEngine.negotiatePendingBatch(batchSize);
      res.json({ success: true, results, count: results.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/negotiation/config', (req, res) => {
    try {
      negotiationEngine.setWeights(req.body);
      res.json({ success: true, weights: negotiationEngine.getWeights() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Robot Failure Simulation
  app.post('/api/robot/:id/fail', (req, res) => {
    try {
      const report = simulationManager.simulateFailure(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, error: 'Robot not found or cannot fail' });
      }
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/robot/fail-random', (_req, res) => {
    try {
      const report = simulationManager.simulateFailure();
      if (!report) {
        return res.status(400).json({ success: false, error: 'No suitable robot available to fail' });
      }
      res.json({ success: true, report });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // --- 5B. Section 40 Deadlock APIs ---
  const deadlockEngine = simulationManager.getDeadlockEngine();

  app.get('/api/deadlocks', (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const deadlocks = db.getDeadlocks(status);
      res.json({ success: true, count: deadlocks.length, deadlocks });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/deadlocks/active', (_req, res) => {
    try {
      const active = db.getDeadlocks('DETECTED').concat(db.getDeadlocks('RECOVERING'));
      res.json({ success: true, count: active.length, active });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/deadlocks/history', (_req, res) => {
    try {
      const history = db.getDeadlocks('RECOVERED', 50);
      res.json({ success: true, count: history.length, history });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/deadlock/simulate', (req, res) => {
    try {
      const params = req.body || {};
      const record = deadlockEngine.simulateDeadlock(params);
      res.json({ success: true, deadlock: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/deadlock/recover/:id', (req, res) => {
    try {
      const record = deadlockEngine.executeRecovery(req.params.id);
      if (!record) {
        return res.status(404).json({ success: false, error: 'Deadlock not found or already recovered' });
      }
      res.json({ success: true, deadlock: record });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/wait-for-graph', (_req, res) => {
    try {
      const graph = deadlockEngine.getWaitForGraph();
      res.json({ success: true, graph });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/deadlock/policy', (req, res) => {
    try {
      const { policy } = req.body;
      if (policy) {
        deadlockEngine.setRecoveryPolicy(policy);
      }
      res.json({ success: true, policy: deadlockEngine.getRecoveryPolicy() });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Statistics & Logs
  app.get('/api/statistics', (_req, res) => {
    try {
      const stats = db.getStatistics();
      res.json({ success: true, statistics: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/negotiation/log', (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 30;
      const logs = db.getNegotiationLog(limit);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/events', (req, res) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 40;
      const events = db.getEvents(limit);
      res.json({ success: true, events });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. High-performance composite live-state endpoint
  app.get('/api/live-state', (_req, res) => {
    try {
      const liveState = simulationManager.getLiveState();
      res.json({ success: true, ...liveState });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🤖 Multi-Robot Task Negotiation Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
