// Idea & Todo PWA with Sidebar & Swipe

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
    deleteTodo: (id) => fetch(`/api/todo/${id}`, {method: 'DELETE'}),

    extract: (text) => fetch('/api/extract', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({text})
    }).then(r => r.json())
};

// Sidebar
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebar-toggle');
sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
});

document.querySelectorAll('.sidebar-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sidebar-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-content').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        const type = e.target.dataset.type;
        document.getElementById(`sidebar-${type}`).classList.add('active');
        if (type === 'ideas') loadIdeas();
        else loadTodos();
    });
});

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
        voiceMode = (active === 'ideas') ? 'idea' : (active === 'todos' ? 'todo' : null);
        if (voiceMode) recognition.start();
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

// ===== SWIPE DELETE =====
function setupSwipeDelete(element, id, type) {
    let startX = 0;
    let currentX = 0;
    const threshold = 60;

    element.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        element.style.transition = 'none';
    }, false);

    element.addEventListener('touchmove', (e) => {
        currentX = e.touches[0].clientX;
        const diff = currentX - startX;

        if (diff < -10) {
            element.classList.add('swiping');
            element.querySelector('.item-content').style.transform = `translateX(${Math.max(diff, -80)}px)`;
        }
    }, false);

    element.addEventListener('touchend', () => {
        const diff = currentX - startX;
        element.style.transition = 'all 0.3s ease';

        if (diff < -threshold) {
            // Swiped left enough to delete
            element.classList.add('swiping');
        } else {
            // Reset
            element.classList.remove('swiping');
            element.querySelector('.item-content').style.transform = 'translateX(0)';
        }
    }, false);

    // Delete button click
    const deleteBtn = element.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm('确定删除？')) {
            if (type === 'idea') await API.deleteIdea(id);
            else await API.deleteTodo(id);
            loadIdeas();
            loadTodos();
        }
    });
}

// ===== IDEAS =====
async function loadIdeas() {
    const ideas = await API.getIdeas();
    const mainList = document.getElementById('ideas-list');
    const sidebarList = document.querySelector('#sidebar-ideas .history-list');

    const itemHtml = ideas.map(idea => `
        <div class="item" data-id="${idea.id}">
            <div class="item-content">
                <div class="item-header">
                    <strong>${idea.title}</strong>
                </div>
                ${idea.desc ? `<p>${idea.desc}</p>` : ''}
                ${idea.tags.length ? `<div class="tags">${idea.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-delete">删除</button>
            </div>
        </div>
    `).join('');

    mainList.innerHTML = itemHtml || '<p class="empty">暂无ideas</p>';
    sidebarList.innerHTML = ideas.map(i => `
        <div class="history-item" onclick="highlightIdea('${i.id}')">${i.title}</div>
    `).join('') || '<p class="empty">暂无ideas</p>';

    document.querySelectorAll('#ideas-list .item').forEach(item => {
        setupSwipeDelete(item, item.dataset.id, 'idea');
    });
}

function highlightIdea(id) {
    const item = document.querySelector(`#ideas-list .item[data-id="${id}"]`);
    if (item) {
        item.scrollIntoView({behavior: 'smooth', block: 'center'});
        item.style.background = 'rgba(6, 182, 212, 0.2)';
        setTimeout(() => {
            item.style.background = '';
        }, 2000);
    }
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

// ===== TODOS =====
let currentFilter = '';

async function loadTodos() {
    const todos = await API.getTodos(currentFilter);
    const mainList = document.getElementById('todos-list');
    const sidebarList = document.querySelector('#sidebar-todos .history-list');

    const itemHtml = todos.map(todo => `
        <div class="item ${todo.status}" data-id="${todo.id}">
            <div class="item-content">
                <div class="item-header">
                    <input type="checkbox" ${todo.status === 'done' ? 'checked' : ''}
                           onchange="markTodoDone('${todo.id}', this.checked)">
                    <span class="priority-badge priority-${todo.priority}">${todo.priority}</span>
                    <strong>${todo.title}</strong>
                </div>
                ${todo.deadline ? `<p class="deadline">${todo.deadline}</p>` : ''}
            </div>
            <div class="item-actions">
                <button class="btn-delete">删除</button>
            </div>
        </div>
    `).join('');

    mainList.innerHTML = itemHtml || '<p class="empty">暂无todos</p>';
    sidebarList.innerHTML = todos.map(t => `
        <div class="history-item" onclick="highlightTodo('${t.id}')">${t.title}</div>
    `).join('') || '<p class="empty">暂无todos</p>';

    document.querySelectorAll('#todos-list .item').forEach(item => {
        setupSwipeDelete(item, item.dataset.id, 'todo');
    });
}

function highlightTodo(id) {
    const item = document.querySelector(`#todos-list .item[data-id="${id}"]`);
    if (item) {
        item.scrollIntoView({behavior: 'smooth', block: 'center'});
        item.style.background = 'rgba(6, 182, 212, 0.2)';
        setTimeout(() => {
            item.style.background = '';
        }, 2000);
    }
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

// ===== SMART EXTRACT =====
document.getElementById('extract-btn').addEventListener('click', async () => {
    const text = document.getElementById('extract-text').value.trim();
    if (!text) return;

    const btn = document.getElementById('extract-btn');
    const result = document.getElementById('extract-result');

    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 分析中...';

    try {
        const response = await API.extract(text);

        if (response.ideas) {
            const ideasHtml = response.ideas.map(idea => `
                <div class="extract-item">
                    <strong>💡 ${idea.title}</strong>
                    ${idea.desc ? `<p>${idea.desc}</p>` : ''}
                </div>
            `).join('');

            const todosHtml = response.todos.map(todo => `
                <div class="extract-item todo">
                    <strong>📝 ${todo.title}</strong>
                    ${todo.deadline ? `<p>截止: ${todo.deadline}</p>` : ''}
                </div>
            `).join('');

            result.innerHTML = `
                <div>
                    <h3>✨ 提取结果</h3>
                    ${ideasHtml}
                    ${todosHtml}
                </div>
            `;
        } else {
            result.innerHTML = '<p class="empty">无法提取内容，请重试</p>';
        }
    } catch (err) {
        result.innerHTML = '<p class="empty">提取失败：' + err.message + '</p>';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '✨ 智能提取';
    }
});

// Init
loadIdeas();
loadTodos();

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
