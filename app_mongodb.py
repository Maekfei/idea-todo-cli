#!/usr/bin/env python3.12
"""Flask backend for Idea-Todo PWA with MongoDB"""

from flask import Flask, jsonify, request, send_file
from pymongo import MongoClient
from datetime import datetime
import webbrowser
import threading
import time
import os
from bson import ObjectId

app = Flask(__name__, static_folder='static', static_url_path='')

# MongoDB Connection
MONGO_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/idea-todo')
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command('ping')
    db = client.get_database()
    ideas_col = db['ideas']
    todos_col = db['todos']
except Exception as e:
    print(f"MongoDB Connection Error: {e}")
    print("Falling back to JSON storage...")
    db = None


# ===== API Routes =====
@app.route('/')
def index():
    return send_file('static/index.html')


@app.route('/api/idea', methods=['GET'])
def get_ideas():
    if db is None:
        return jsonify([])

    ideas = list(ideas_col.find())
    for idea in ideas:
        idea['id'] = str(idea['_id'])
        del idea['_id']

    tag = request.args.get('tag')
    if tag:
        ideas = [i for i in ideas if tag in i.get('tags', [])]

    return jsonify(ideas)


@app.route('/api/idea', methods=['POST'])
def add_idea():
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 500

    data = request.json
    idea = {
        'title': data.get('title'),
        'desc': data.get('desc', ''),
        'tags': data.get('tags', []),
        'created': datetime.utcnow()
    }
    result = ideas_col.insert_one(idea)
    idea['id'] = str(result.inserted_id)
    del idea['_id']

    return jsonify(idea), 201


@app.route('/api/idea/<idea_id>', methods=['DELETE'])
def delete_idea(idea_id):
    if db is None:
        return '', 500

    try:
        ideas_col.delete_one({'_id': ObjectId(idea_id)})
    except:
        pass

    return '', 204


@app.route('/api/todo', methods=['GET'])
def get_todos():
    if db is None:
        return jsonify([])

    todos = list(todos_col.find())
    for todo in todos:
        todo['id'] = str(todo['_id'])
        del todo['_id']

    status = request.args.get('status')
    if status:
        todos = [t for t in todos if t['status'] == status]

    return jsonify(todos)


@app.route('/api/todo', methods=['POST'])
def add_todo():
    if db is None:
        return jsonify({'error': 'Database unavailable'}), 500

    data = request.json
    todo = {
        'title': data.get('title'),
        'idea_id': data.get('idea_id', ''),
        'deadline': data.get('deadline', ''),
        'priority': data.get('priority', 'normal'),
        'status': 'pending',
        'created': datetime.utcnow()
    }
    result = todos_col.insert_one(todo)
    todo['id'] = str(result.inserted_id)
    del todo['_id']

    return jsonify(todo), 201


@app.route('/api/todo/<todo_id>/done', methods=['PATCH'])
def mark_todo_done(todo_id):
    if db is None:
        return '', 500

    try:
        todos_col.update_one({'_id': ObjectId(todo_id)}, {'$set': {'status': 'done'}})
        todo = todos_col.find_one({'_id': ObjectId(todo_id)})
        todo['id'] = str(todo['_id'])
        del todo['_id']
        return jsonify(todo)
    except:
        return '', 404


@app.route('/api/todo/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    if db is None:
        return '', 500

    try:
        todos_col.delete_one({'_id': ObjectId(todo_id)})
    except:
        pass

    return '', 204


def open_browser():
    """Open browser after slight delay."""
    time.sleep(1)
    webbrowser.open('http://localhost:5000')


if __name__ == '__main__':
    # Only auto-open browser in development
    if os.getenv('FLASK_ENV') != 'production':
        threading.Thread(target=open_browser, daemon=True).start()

    app.run(debug=False, port=int(os.getenv('PORT', 5000)))
