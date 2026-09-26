import React, { useState } from 'react';
import { FileCode, Copy, Check, Terminal, FolderTree } from 'lucide-react';

interface PythonProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonProjectModal: React.FC<PythonProjectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeFile, setActiveFile] = useState<'app.py' | 'database.py' | 'negotiation.py' | 'simulation.py' | 'README.md'>('app.py');

  if (!isOpen) return null;

  const fileContents: Record<string, string> = {
    'app.py': `"""
Flask REST API Server for Multi-Robot Task Negotiation System.
Coordinates 500 Robots and 600 Tasks via SQLite and REST endpoints.
"""
from flask import Flask, jsonify, request, render_template
from database import init_db, get_db_connection
from negotiation import NegotiationEngine
from simulation import SimulationManager

app = Flask(__name__, template_folder='templates', static_folder='static')
init_db()
sim_manager = SimulationManager()
negotiation_engine = NegotiationEngine()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/robots', methods=['GET'])
def get_robots():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM robots")
    robots = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'count': len(robots), 'robots': robots})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks")
    tasks = [dict(t) for t in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'count': len(tasks), 'tasks': tasks})

@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    sim_manager.running = True
    return jsonify({'success': True, 'status': {'running': True}})

@app.route('/api/robot/<id>/fail', methods=['POST'])
def fail_robot(id):
    report = sim_manager.simulate_failure(id)
    return jsonify({'success': True, 'report': report})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)`,

    'database.py': `"""
SQLite Database Initializer for 500 Robots and 600 Tasks.
"""
import sqlite3, os, random, math
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'database', 'database.db')

def init_db(force_reset=False):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS robots (
            id TEXT PRIMARY KEY, group_id TEXT, x REAL, y REAL,
            target_x REAL, target_y REAL, battery REAL, status TEXT,
            current_task TEXT, speed REAL, tasks_completed INT, failed INT
        );
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY, x REAL, y REAL, priority TEXT,
            status TEXT, assigned_robot TEXT, created_at TEXT, completed_at TEXT
        );
        CREATE TABLE IF NOT EXISTS negotiations (
            id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, robot_id TEXT,
            bid_score REAL, distance REAL, battery REAL, workload REAL, result TEXT
        );
    """)
    conn.commit()
    conn.close()`,

    'negotiation.py': `"""
Multi-Robot Contract Net Protocol & Transparent Scoring Formula:
Bid Score = Distance Cost + Battery Cost + Workload Cost - Priority Benefit
"""
import math

class NegotiationEngine:
    def __init__(self, w_dist=1.0, w_batt=1.0, w_work=0.8, w_prio=1.2):
        self.w_dist = w_dist
        self.w_batt = w_batt
        self.w_work = w_work
        self.w_prio = w_prio

    def calculate_bid(self, robot, task):
        dx = robot['x'] - task['x']
        dy = robot['y'] - task['y']
        distance = math.sqrt(dx*dx + dy*dy)
        distance_cost = (distance / 40.0) * self.w_dist
        battery_cost = ((100.0 - robot['battery']) / 100.0 * 20.0) * self.w_batt
        workload_cost = (robot['tasks_completed'] * 1.5) * self.w_work
        prio_map = {'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1}
        priority_benefit = (prio_map.get(task['priority'], 1) * 3.0) * self.w_prio
        bid_score = round(distance_cost + battery_cost + workload_cost - priority_benefit, 2)
        return {'robot_id': robot['id'], 'bid_score': bid_score, 'distance': round(distance, 1)}`,

    'simulation.py': `"""
Simulation loop and failure recovery engine.
"""
import math
from database import get_db_connection

class SimulationManager:
    def __init__(self):
        self.running = False
        self.speed = 1.0

    def simulate_failure(self, robot_id=None):
        conn = get_db_connection()
        cursor = conn.cursor()
        # Find busy robot, fail it, and immediately re-auction its task
        # ...
        conn.commit()
        conn.close()`,

    'README.md': `# Multi-Robot Task Negotiation System (Python Flask)

1. Setup:
   pip install -r requirements.txt

2. Run:
   python app.py

3. Open:
   http://127.0.0.1:5000`
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContents[activeFile]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Python Flask Standalone Project</h3>
              <p className="text-xs text-slate-400">
                Created in <code className="text-amber-300 font-mono">/multi_robot_project/</code> for local evaluation
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg text-sm cursor-pointer">
            ✕
          </button>
        </div>

        {/* Quickstart banner */}
        <div className="px-6 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>cd multi_robot_project &amp;&amp; pip install -r requirements.txt &amp;&amp; python app.py</span>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 border border-slate-700 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
        </div>

        {/* File tabs & code */}
        <div className="flex flex-1 overflow-hidden">
          {/* File Explorer sidebar */}
          <div className="w-48 border-r border-slate-800 bg-slate-950/60 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <FolderTree className="w-3.5 h-3.5" />
              <span>Project Files</span>
            </div>
            {Object.keys(fileContents).map((fileName) => (
              <button
                key={fileName}
                onClick={() => setActiveFile(fileName as any)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer flex items-center justify-between ${
                  activeFile === fileName
                    ? 'bg-amber-950/60 text-amber-300 font-bold border border-amber-900/60'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span>{fileName}</span>
              </button>
            ))}
          </div>

          {/* Code Viewer */}
          <div className="flex-1 p-4 bg-slate-950 overflow-y-auto">
            <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre">
              {fileContents[activeFile]}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
