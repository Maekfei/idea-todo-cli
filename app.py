#!/usr/bin/env python3.12
"""Flask backend for Idea-Todo PWA"""

from flask import Flask, jsonify, request
from pathlib import Path
import json
import webbrowser
import threading
import time

app = Flask(__name__, static_folder='static', static_url_path='')

DATA_DIR = Path.home() / ".idea-todo"
DATA_DIR.mkdir(exist_ok=True)
IDEAS_FILE = DATA_DIR / "ideas.json"
TODOS_FILE = DATA_DIR / "todos.json"


def load_json(path):
    """Load JSON file, return empty list if missing."""
    return json.loads(path.read_text()) if path.exists() else []


def save_json(path, data):
    """Save data to JSON."""
    path.write_text(json.dumps(data, indent=2, default=str))


def gen_id():
    """Generate simple timestamp ID."""
    from datetime import datetime
    return datetime.now().strftime("%Y%m%d%H%M%S%f")[:14]


# ===== API Routes =====
@app.route('/')
def index():
    from flask import send_file
    return send_file('static/index.html')


@app.route('/api/idea', methods=['GET'])
def get_ideas():
    ideas = load_json(IDEAS_FILE)
    if request.args.get('tag'):
        ideas = [i for i in ideas if request.args.get('tag') in i.get('tags', [])]
    return jsonify(ideas)


@app.route('/api/idea', methods=['POST'])
def add_idea():
    data = request.json
    ideas = load_json(IDEAS_FILE)
    idea = {
        'id': gen_id(),
        'title': data.get('title'),
        'desc': data.get('desc', ''),
        'tags': data.get('tags', []),
        'created': str(__import__('datetime').datetime.now().isoformat())
    }
    ideas.append(idea)
    save_json(IDEAS_FILE, ideas)
    return jsonify(idea), 201


@app.route('/api/idea/<idea_id>', methods=['DELETE'])
def delete_idea(idea_id):
    ideas = load_json(IDEAS_FILE)
    ideas = [i for i in ideas if i['id'] != idea_id]
    save_json(IDEAS_FILE, ideas)
    return '', 204


@app.route('/api/todo', methods=['GET'])
def get_todos():
    todos = load_json(TODOS_FILE)
    if request.args.get('status'):
        todos = [t for t in todos if t['status'] == request.args.get('status')]
    return jsonify(todos)


@app.route('/api/todo', methods=['POST'])
def add_todo():
    data = request.json
    todos = load_json(TODOS_FILE)
    todo = {
        'id': gen_id(),
        'title': data.get('title'),
        'idea_id': data.get('idea_id', ''),
        'deadline': data.get('deadline', ''),
        'priority': data.get('priority', 'normal'),
        'status': 'pending',
        'created': str(__import__('datetime').datetime.now().isoformat())
    }
    todos.append(todo)
    save_json(TODOS_FILE, todos)
    return jsonify(todo), 201


@app.route('/api/todo/<todo_id>/done', methods=['PATCH'])
def mark_todo_done(todo_id):
    todos = load_json(TODOS_FILE)
    for t in todos:
        if t['id'] == todo_id:
            t['status'] = 'done'
            break
    save_json(TODOS_FILE, todos)
    return jsonify(t if t['id'] == todo_id else {})


@app.route('/api/todo/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    todos = load_json(TODOS_FILE)
    todos = [t for t in todos if t['id'] != todo_id]
    save_json(TODOS_FILE, todos)
    return '', 204


def open_browser():
    """Open browser after slight delay."""
    time.sleep(1)
    webbrowser.open('http://localhost:5000')


if __name__ == '__main__':
    threading.Thread(target=open_browser, daemon=True).start()
    app.run(debug=False, port=5000)
