#!/usr/bin/env python3.12
"""Flask backend for Idea-Todo PWA with MongoDB and User Isolation"""

from flask import Flask, jsonify, request, send_file
from pymongo import MongoClient
from datetime import datetime
import webbrowser
import threading
import time
import os
import requests
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
    db = None


def get_user_id():
    """Extract user_id from request (header or param)"""
    user_id = request.headers.get('X-User-ID') or request.args.get('user_id')
    if not user_id:
        return 'default'
    return user_id


# ===== API Routes =====
@app.route('/')
def index():
    return send_file('static/index.html')


@app.route('/api/idea', methods=['GET'])
def get_ideas():
    if db is None:
        return jsonify([])

    user_id = get_user_id()
    ideas = list(ideas_col.find({'user_id': user_id}))
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

    user_id = get_user_id()
    data = request.json
    idea = {
        'title': data.get('title'),
        'desc': data.get('desc', ''),
        'tags': data.get('tags', []),
        'user_id': user_id,
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

    user_id = get_user_id()
    try:
        ideas_col.delete_one({'_id': ObjectId(idea_id), 'user_id': user_id})
    except:
        pass

    return '', 204


@app.route('/api/todo', methods=['GET'])
def get_todos():
    if db is None:
        return jsonify([])

    user_id = get_user_id()
    todos = list(todos_col.find({'user_id': user_id}))
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

    user_id = get_user_id()
    data = request.json
    todo = {
        'title': data.get('title'),
        'idea_id': data.get('idea_id', ''),
        'deadline': data.get('deadline', ''),
        'priority': data.get('priority', 'normal'),
        'user_id': user_id,
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

    user_id = get_user_id()
    try:
        todos_col.update_one(
            {'_id': ObjectId(todo_id), 'user_id': user_id},
            {'$set': {'status': 'done'}}
        )
        todo = todos_col.find_one({'_id': ObjectId(todo_id)})
        if todo:
            todo['id'] = str(todo['_id'])
            del todo['_id']
            return jsonify(todo)
    except:
        pass

    return '', 404


@app.route('/api/todo/<todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    if db is None:
        return '', 500

    user_id = get_user_id()
    try:
        todos_col.delete_one({'_id': ObjectId(todo_id), 'user_id': user_id})
    except:
        pass

    return '', 204


@app.route('/api/extract', methods=['POST'])
def extract_text():
    """Extract ideas and todos from text using Kimi API"""
    import json as json_lib

    user_id = get_user_id()
    data = request.json
    text = data.get('text', '')

    if not text:
        return jsonify({'error': 'No text provided'}), 400

    api_key = os.getenv('KIMI_API_KEY')
    if not api_key:
        print('ERROR: KIMI_API_KEY not configured')
        return jsonify({'error': 'API key not configured'}), 500

    try:
        print(f'Calling Kimi API with text: {text[:100]}...')

        response = requests.post(
            'https://xuedingmao.top/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'kimi-k2.5',
                'messages': [
                    {
                        'role': 'user',
                        'content': f"""从以下文本中提取ideas和todos，返回JSON格式：
{{"ideas": [{{"title": "...", "desc": "...", "tags": ["tag1", "tag2"]}}], "todos": [{{"title": "...", "deadline": "YYYY-MM-DD", "priority": "low|normal|high"}}]}}

文本：
{text}

要求：
- 提取出所有有意义的ideas和todos
- ideas：创意、想法、观点
- todos：任务、行动项、待办事项
- 优先级：high(紧急), normal(普通), low(低优先级)
- 返回纯JSON，无其他文本"""
                    }
                ],
                'temperature': 0.3
            },
            timeout=30
        )

        print(f'API Response Status: {response.status_code}')

        if response.status_code != 200:
            error_msg = response.text
            print(f'API Error: {error_msg}')
            return jsonify({'error': f'API error: {response.status_code}'}), 500

        result = response.json()
        content = result['choices'][0]['message']['content']

        print(f'API Content: {content}')

        # Parse JSON from response
        try:
            start = content.find('{')
            end = content.rfind('}') + 1
            if start >= 0 and end > start:
                extracted = json_lib.loads(content[start:end])
                print(f'Extracted: {extracted}')
                return jsonify(extracted)
            else:
                print('No JSON found in response')
                return jsonify({'ideas': [], 'todos': []})
        except json_lib.JSONDecodeError as e:
            print(f'JSON Parse Error: {e}')
            return jsonify({'ideas': [], 'todos': []})

    except requests.exceptions.Timeout:
        print('API Request Timeout')
        return jsonify({'error': 'Request timeout'}), 504
    except Exception as e:
        print(f'Extract Error: {str(e)}')
        return jsonify({'error': str(e)}), 500


def open_browser():
    """Open browser after slight delay."""
    time.sleep(1)
    webbrowser.open('http://localhost:5000')


if __name__ == '__main__':
    if os.getenv('FLASK_ENV') != 'production':
        threading.Thread(target=open_browser, daemon=True).start()
    app.run(debug=False, port=int(os.getenv('PORT', 5000)), host='0.0.0.0')
