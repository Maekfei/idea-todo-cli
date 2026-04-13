// Idea & Todo PWA with User Isolation & Smart Extract

// User Management
let currentUser = localStorage.getItem('currentUser') || 'default';
const users = JSON.parse(localStorage.getItem('ideaTodoUsers') || '["default"]');

function getHeaders() {
    return {'X-User-ID': currentUser, 'Content-Type': 'application/json'};
}

const API = {
    getIdeas: () => fetch(`/api/idea?user_id=${currentUser}`).then(r => r.json()),
    addIdea: (title, desc, tags) => fetch('/api/idea', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({title, desc, tags: tags.split(' ').filter(Boolean)})
    }).then(r => r.json()),
    deleteIdea: (id) => fetch(`/api/idea/${id}`, {method: 'DELETE', headers: getHeaders()}),

    getTodos: (status='') => fetch(`/api/todo?status=${status}&user_id=${currentUser}`).then(r => r.json()),
    addTodo: (title, deadline, priority) => fetch('/api/todo', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({title, deadline, priority})
    }).then(r => r.json()),
    markDone: (id) => fetch(`/api/todo/${id}/done`, {method: 'PATCH', headers: getHeaders()}).then(r => r.json()),
    deleteTodo: (id) => fetch(`/api/todo/${id}`, {method: 'DELETE', headers: getHeaders()}),

    extract: (text) => fetch('/api/extract', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({text})
    }).then(r => r.json())
};

// User Selector UI
const userBtn = document.getElementById('user-btn');
const userMenu = document.getElementById('user-menu');
const usernameInput = document.getElementById('username-input');
const userConfirmBtn = document.getElementById('user-confirm-btn');
const userList = document.getElementById('user-list');

function updateUserUI() {
    userBtn.textContent = `👤 ${currentUser}`;
    userList.innerHTML = users.map(u => `
        <button class="user-item ${u === currentUser ? 'active' : ''}" onclick="switchUser('${u}')">${u}</button>
    `).join('');
}

function switchUser(username) {
    currentUser = username;
    localStorage.setItem('currentUser', currentUser);
    userMenu.style.display = 'none';
    updateUserUI();
    loadIdeas();
    loadTodos();
}

function addNewUser() {
    const username = usernameInput.value.trim();
    if (!username) return;
    if (users.includes(username)) {
        alert('用户已存在');
        return;
    }
    users.push(username);
    localStorage.setItem('ideaTodoUsers', JSON.stringify(users));
    switchUser(username);
    usernameInput.value = '';
}

userBtn.addEventListener('click', () => {
    userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
});

userConfirmBtn.addEventListener('click', addNewUser);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNewUser();
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-selector')) {
        userMenu.style.display = 'none';
    }
});

// Sidebar - with safe DOM checking and debugging
function initSidebar() {
    console.log('=== initSidebar called ===');
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');

    console.log('sidebar element:', sidebar);
    console.log('sidebarToggle element:', sidebarToggle);

    if (!sidebar || !sidebarToggle) {
        console.error('❌ Sidebar elements not found!');
        console.error('Looking for sidebar with querySelector: .sidebar');
        console.error('Looking for toggle with getElementById: sidebar-toggle');
        return;
    }

    console.log('✅ Sidebar elements found');

    // Force show/hide sidebar toggle based on viewport width
    function updateSidebarToggleVisibility() {
        const width = window.innerWidth;
        console.log('updateSidebarToggleVisibility: window.innerWidth =', width);

        if (width <= 768) {
            // Force all visibility properties on mobile
            sidebarToggle.setAttribute('style', 'display: block !important; visibility: visible !important; opacity: 1 !important; pointer-events: auto !important;');
            console.log('📱 Mobile detected - showing sidebar toggle');
            // Double check it's visible
            console.log('sidebarToggle.style.display:', sidebarToggle.style.display);
            console.log('computed display:', window.getComputedStyle(sidebarToggle).display);
            console.log('sidebarToggle.getAttribute("style"):', sidebarToggle.getAttribute('style'));
        } else {
            sidebarToggle.style.display = 'none';
            console.log('🖥️ Desktop detected - hiding sidebar toggle');
        }
    }

    // Call on load and on resize
    console.log('Calling updateSidebarToggleVisibility on load...');
    updateSidebarToggleVisibility();

    window.addEventListener('resize', updateSidebarToggleVisibility);
    console.log('Added resize listener');

    sidebarToggle.addEventListener('click', () => {
        console.log('Sidebar toggle clicked');
        sidebar.classList.toggle('open');
    });
}

// Initialize when DOM is ready
console.log('Script loaded, document.readyState:', document.readyState);
if (document.readyState === 'loading') {
    console.log('DOM still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initSidebar);
} else {
    console.log('DOM already loaded, calling initSidebar immediately...');
    initSidebar();
}

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
            element.classList.add('swiping');
        } else {
            element.classList.remove('swiping');
            element.querySelector('.item-content').style.transform = 'translateX(0)';
        }
    }, false);

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

        if (response.ideas || response.todos) {
            let html = '<div class="extract-items">';

            if (response.ideas && response.ideas.length) {
                html += '<h3>💡 Ideas</h3>';
                html += response.ideas.map(idea => `
                    <div class="extract-item">
                        <div class="extract-item-header">
                            <strong>${idea.title}</strong>
                            <button class="btn-add-idea" onclick="addExtractedIdea('${idea.title.replace(/'/g, "\\'")}', '${(idea.desc || '').replace(/'/g, "\\'")}', '${(idea.tags || []).join(' ').replace(/'/g, "\\'")}'">+ 添加</button>
                        </div>
                        ${idea.desc ? `<p>${idea.desc}</p>` : ''}
                    </div>
                `).join('');
            }

            if (response.todos && response.todos.length) {
                html += '<h3>📝 Todos</h3>';
                html += response.todos.map(todo => `
                    <div class="extract-item todo">
                        <div class="extract-item-header">
                            <strong>${todo.title}</strong>
                            <button class="btn-add-todo" onclick="addExtractedTodo('${todo.title.replace(/'/g, "\\'")}', '${(todo.deadline || '').replace(/'/g, "\\'")}', '${(todo.priority || 'normal').replace(/'/g, "\\'")}'">+ 添加</button>
                        </div>
                        ${todo.deadline ? `<p>截止: ${todo.deadline}</p>` : ''}
                    </div>
                `).join('');
            }

            html += '</div>';
            result.innerHTML = html;
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

async function addExtractedIdea(title, desc, tags) {
    if (!title) return;
    const idea = await API.addIdea(title, desc, tags);
    if (idea.id) {
        alert('已添加到Ideas');
        loadIdeas();
    }
}

async function addExtractedTodo(title, deadline, priority) {
    if (!title) return;
    const todo = await API.addTodo(title, deadline, priority || 'normal');
    if (todo.id) {
        alert('已添加到Todos');
        loadTodos();
    }
}

// Init
updateUserUI();
loadIdeas();
loadTodos();

// Register Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}
