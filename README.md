# Idea & Todo PWA

A lightweight progressive web app for recording ideas and todos with voice input support.

**Powered by**: Flask + MongoDB + Service Worker

## Features

✨ **Ideas Management**
- Add ideas with title, description, and tags
- Filter by tags
- Local storage

📝 **Todo Tracking**
- Add todos with priority levels and deadlines
- Filter by status (pending/done)
- Mark as done with checkbox

🎤 **Voice Input**
- Press the microphone button and speak
- Auto-transcribe to idea/todo title
- Supports Chinese

📱 **PWA**
- Install to home screen on mobile
- Works offline (read-only mode)
- Dark theme optimized for readability

## Quick Start

### 本地开发 (JSON存储)
```bash
cd /Users/lumingfei/Desktop/科研workflow/idea-todo-cli
pip install flask
python3.12 app.py
```

### 生产部署 (MongoDB + Render)
详见 [DEPLOY.md](DEPLOY.md) - 15-20分钟一步到位

部署完成后，访问Render提供的公网URL，支持：
- ✓ 跨地域访问（任何地方任何设备）
- ✓ 数据持久化（MongoDB自动备份）
- ✓ 高可用（Render免费plan有uptime保证）

### Mobile Access

1. Get your computer's local IP:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   (e.g., `192.168.1.100`)

2. On phone browser, visit: `http://192.168.1.100:5000`

3. Click "Add to Home Screen" to install PWA

## File Structure

```
idea-todo-cli/
├── app.py              # Flask backend (JSON, local dev)
├── app_mongodb.py      # Flask backend (MongoDB, production)
├── requirements.txt    # Python dependencies
├── Procfile            # Render deployment config
├── .gitignore          # Git ignore rules
├── .env.example        # Environment variables template
├── DEPLOY.md           # 部署指南 ⭐ 必读
├── README.md           # This file
├── static/
│   ├── index.html      # PWA shell
│   ├── app.js          # Frontend logic + voice input
│   ├── style.css       # Dark theme UI
│   ├── sw.js           # Service worker (offline support)
│   └── manifest.json   # PWA config
└── .env                # (create locally) Environment secrets
```

## Data Storage

### Development (本地 JSON)
- `~/.idea-todo/ideas.json`, `~/.idea-todo/todos.json`
- 用 `app.py` 启动（本地only）

### Production (MongoDB云)
- 用 `app_mongodb.py` 启动
- 数据存储在MongoDB Atlas (免费M0集群)
- 自动备份，高可用

**部署指南**: 详见 [DEPLOY.md](DEPLOY.md)

## API Endpoints

```
GET  /api/idea           - List ideas
POST /api/idea           - Add idea
DEL  /api/idea/<id>      - Delete idea

GET  /api/todo           - List todos (with ?status=pending|done)
POST /api/todo           - Add todo
PATCH /api/todo/<id>/done - Mark done
DEL  /api/todo/<id>      - Delete todo
```

## Browser Support

- Chrome/Edge (desktop + mobile)
- Safari (iOS 14+)
- Firefox

Requires Web Speech API for voice input (Chrome/Edge recommended).

## Troubleshooting

**Voice input not working?**
- Make sure browser has microphone permission
- Chrome/Edge support Chinese better than Firefox
- Try saying full sentence for better recognition

**Offline mode limited?**
- Service worker only caches reads; writes need backend
- Restart app after online to sync

**Can't find run.sh?**
- Make sure you're in the right directory:
  ```bash
  cd /Users/lumingfei/Desktop/科研workflow/idea-todo-cli
  chmod +x run.sh
  ./run.sh
  ```
