"""
Flask REST API Server for Multi-Robot Task Negotiation System.
"""

from flask import Flask, jsonify, request, render_template
from database import init_db, get_db_connection
from negotiation import NegotiationEngine
from simulation import SimulationManager
import os

app = Flask(__name__, template_folder='templates', static_folder='static')
init_db()
sim_manager = SimulationManager()
negotiation_engine = NegotiationEngine()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/robots', methods=['GET'])
def get_robots():
    status = request.args.get('status')
    group = request.args.get('group')
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM robots WHERE 1=1"
    params = []
    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)
    if group and group != 'all':
        query += " AND group_id = ?"
        params.append(group)
    cursor.execute(query, params)
    robots = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'count': len(robots), 'robots': robots})

@app.route('/api/robots/<id>', methods=['GET'])
def get_robot(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM robots WHERE id = ?", (id,))
    robot = cursor.fetchone()
    conn.close()
    if not robot:
        return jsonify({'success': False, 'error': 'Robot not found'}), 404
    return jsonify({'success': True, 'robot': dict(robot)})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    status = request.args.get('status')
    conn = get_db_connection()
    cursor = conn.cursor()
    query = "SELECT * FROM tasks WHERE 1=1"
    params = []
    if status and status != 'all':
        query += " AND status = ?"
        params.append(status)
    cursor.execute(query, params)
    tasks = [dict(t) for t in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'count': len(tasks), 'tasks': tasks})

@app.route('/api/tasks/<id>', methods=['GET'])
def get_task(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE id = ?", (id,))
    task = cursor.fetchone()
    conn.close()
    if not task:
        return jsonify({'success': False, 'error': 'Task not found'}), 404
    return jsonify({'success': True, 'task': dict(task)})

@app.route('/api/simulation/start', methods=['POST'])
def start_simulation():
    sim_manager.running = True
    return jsonify({'success': True, 'status': {'running': True, 'speed': sim_manager.speed}})

@app.route('/api/simulation/pause', methods=['POST'])
def pause_simulation():
    sim_manager.running = False
    return jsonify({'success': True, 'status': {'running': False, 'speed': sim_manager.speed}})

@app.route('/api/simulation/reset', methods=['POST'])
def reset_simulation():
    sim_manager.running = False
    init_db(force_reset=True)
    return jsonify({'success': True, 'message': 'Simulation reset to 500 Robots and 600 Tasks.'})

@app.route('/api/simulation/tick', methods=['POST'])
def simulation_tick():
    completed = sim_manager.tick()
    return jsonify({'success': True, 'completed': completed})

@app.route('/api/tasks/generate', methods=['POST'])
def generate_tasks():
    init_db(force_reset=True)
    return jsonify({'success': True, 'message': 'Regenerated tasks and robots.'})

@app.route('/api/negotiation/start', methods=['POST'])
def start_negotiation():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tasks WHERE status = 'pending' LIMIT 5")
    pending = [dict(t) for t in cursor.fetchall()]
    results = []
    for t in pending:
        res = negotiation_engine.negotiate_task(conn, t, False)
        if res:
            results.append(res)
    conn.close()
    return jsonify({'success': True, 'results': results, 'count': len(results)})

@app.route('/api/robot/<id>/fail', methods=['POST'])
def fail_robot(id):
    report = sim_manager.simulate_failure(id)
    if not report:
        return jsonify({'success': False, 'error': 'Robot not found'}), 404
    return jsonify({'success': True, 'report': report})

@app.route('/api/robot/fail-random', methods=['POST'])
def fail_random():
    report = sim_manager.simulate_failure()
    if not report:
        return jsonify({'success': False, 'error': 'No robot available'}), 400
    return jsonify({'success': True, 'report': report})

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM robots")
    total_robots = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tasks")
    total_tasks = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM robots WHERE status = 'idle' AND failed = 0")
    idle_robots = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM robots WHERE status IN ('moving', 'negotiating') AND failed = 0")
    busy_robots = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM robots WHERE failed = 1")
    failed_robots = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'completed'")
    completed_tasks = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE status = 'pending'")
    pending_tasks = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM negotiations WHERE result = 'winner'")
    negotiations = cursor.fetchone()[0]
    conn.close()

    return jsonify({
        'success': True,
        'statistics': {
            'total_robots': total_robots,
            'total_tasks': total_tasks,
            'idle_robots': idle_robots,
            'busy_robots': busy_robots,
            'failed_robots': failed_robots,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'negotiations': negotiations
        }
    })

@app.route('/api/negotiation/log', methods=['GET'])
def get_negotiation_log():
    limit = request.args.get('limit', 30, type=int)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM negotiations ORDER BY id DESC LIMIT ?", (limit,))
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'logs': logs})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
