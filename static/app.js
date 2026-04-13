// Idea & Todo PWA Frontend

const API = {
    getIdeas: () => fetch('/api/idea').then(r => r.json()),
    addIdea: (title, desc, tags) => fetch('/api/idea', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({title, desc, tags: tags.split(' ').filter(Boolean)})
    }).then(r => r.json()),
    deleteIdea: (id) => fetch(`/api/idea/${id}`, {method: 'DELETE'}),

    getTodos: (status='') => fetch(`/api/todo?status=${status}`).then(r => r.json()),
    addTodo: (title, deadline, priority) => fetch('/api/todo', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({title, deadline, priority})
    }).then(r => r.json()),
    markDone: (id) => fetch(`/api/todo/${id}/done`, {method: 'PATCH'}).then(r => r.json()),
    deleteTodo: (id) => fetch(`/api/todo/${id}`, {method: 'DELETE'})
};

// Voice Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;
recognition.lang = 'zh-CN';

let voiceMode = null;
let isListening = false;

recognition.onstart = () => {
    isListening = true;
    document.getElementById('voice-status').textContent = '🎤 正在监听...';
    document.getElementById('voice-status').classList.add('active');
};

recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (voiceMode === 'idea') {
        document.getElementById('idea-title').value = transcript;
    } else if (voiceMode === 'todo') {
        document.getElementById('todo-title').value = transcript;
    }
    document.getElementById('voice-status').textContent = `✓ "${transcript}"`;
};

recognition.onerror = (event) => {
    document.getElementById('voice-status').textContent = `✗ 错误: ${event.error}`;
};

recognition.onend = () => {
    isListening = false;
    setTimeout(() => {
        document.getElementById('voice-status').classList.remove('active');
    }, 2000);
};

// Voice Button
document.getElementById('voice-btn').addEventListener('click', () => {
    if (isListening) {
        recognition.stop();
    } else {
        const active = document.querySelector('.tab-btn.active').dataset.tab;
        voiceMode = active === 'ideas' ? 'idea' : 'todo';
        recognition.start();
    }
});

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.tab).classList.add('active');
    });
});

// ===== IDEAS =====
async function loadIdeas() {
    const ideas = await API.getIdeas();
    const html = ideas.map(idea => `
        <div class="item">
            <div class="item-header">
                <strong>${idea.title}</strong>
                <button class="btn-delete" onclick="deleteIdeaItem('${idea.id}')">删除</button>
            </div>
            ${idea.desc ? `<p>${idea.desc}</p>` : ''}
            ${idea.tags.length ? `<div class="tags">${idea.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
        </div>
    `).join('');
    document.getElementById('ideas-list').innerHTML = html || '<p class="empty">暂无ideas</p>';
}

document.getElementById('idea-add-btn').addEventListener('click', async () => {
    const title = document.getElementById('idea-title').value.trim();
    if (!title) return;

    await API.addIdea(
        title,
        document.getElementById('idea-desc').value.trim(),
        document.getElementById('idea-tags').value.trim()
    );

    document.getElementById('idea-title').value = '';
    document.getElementById('idea-desc').value = '';
    document.getElementById('idea-tags').value = '';
    loadIdeas();
});

async function deleteIdeaItem(id) {
    if (confirm('确定删除？')) {
        await API.deleteIdea(id);
        loadIdeas();
    }
}

// ===== TODOS =====
let currentFilter = '';

async function loadTodos() {
    const todos = await API.getTodos(currentFilter);
    const html = todos.map(todo => `
        <div class="item ${todo.status}">
            <div class="item-header">
                <input type="checkbox" ${todo.status === 'done' ? 'checked' : ''}
                       onchange="markTodoDone('${todo.id}', this.checked)">
                <span class="priority-badge priority-${todo.priority}">${todo.priority}</span>
                <strong>${todo.title}</strong>
                <button class="btn-delete" onclick="deleteTodoItem('${todo.id}')">删除</button>
            </div>
            ${todo.deadline ? `<p class="deadline">截止: ${todo.deadline}</p>` : ''}
        </div>
    `).join('');
    document.getElementById('todos-list').innerHTML = html || '<p class="empty">暂无todos</p>';
}

document.getElementById('todo-add-btn').addEventListener('click', async () => {
    const title = document.getElementById('todo-title').value.trim();
    if (!title) return;

    await API.addTodo(
        title,
        document.getElementById('todo-deadline').value || '',
        document.getElementById('todo-priority').value
    );

    document.getElementById('todo-title').value = '';
    document.getElementById('todo-deadline').value = '';
    document.getElementById('todo-priority').value = 'normal';
    loadTodos();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        loadTodos();
    });
});

async function markTodoDone(id, isDone) {
    await API.markDone(id);
    loadTodos();
}

async function deleteTodoItem(id) {
    if (confirm('确定删除？')) {
        await API.deleteTodo(id);
        loadTodos();
    }
}

// Init
loadIdeas();
loadTodos();

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
