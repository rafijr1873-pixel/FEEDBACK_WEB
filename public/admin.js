const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const passwordInput = document.getElementById('passwordInput');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginSpinner = document.getElementById('loginSpinner');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const refreshBtn = document.getElementById('refreshBtn');
const messagesList = document.getElementById('messagesList');
const messagesCount = document.getElementById('messagesCount');
const totalCount = document.getElementById('totalCount');
const latestTime = document.getElementById('latestTime');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');
const toastIcon = document.getElementById('toastIcon');

let token = localStorage.getItem('admin_token') || null;

function getAuthHeaders() {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

function showToast(message, isError = false) {
  toastText.textContent = message;
  toast.classList.toggle('error', isError);
  toastIcon.textContent = isError ? '✕' : '✓';
  toastIcon.style.background = isError ? 'var(--danger)' : '#10b981';
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function formatDate(isoString) {
  const d = new Date(isoString);
  // MySQL datetime from sqlite is like "2026-05-13 12:44:00" without timezone, treat as local
  // If isoString doesn't contain T, we need to handle
  let date = d;
  if (isNaN(d.getTime())) {
    // try parsing as "YYYY-MM-DD HH:MM:SS"
    date = new Date(isoString.replace(' ', 'T'));
  }
  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function timeAgo(isoString) {
  let d = new Date(isoString);
  if (isNaN(d.getTime())) d = new Date(isoString.replace(' ', 'T'));
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

async function checkAuth() {
  if (!token) return false;
  try {
    const res = await fetch('/api/admin/check', {
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return data.authenticated === true;
  } catch {
    return false;
  }
}

function showLogin() {
  loginView.style.display = 'block';
  dashboardView.style.display = 'none';
  logoutBtn.style.display = 'none';
}

function showDashboard() {
  loginView.style.display = 'none';
  dashboardView.style.display = 'block';
  logoutBtn.style.display = 'inline-flex';
  loadMessages();
}

async function init() {
  const isAuthed = await checkAuth();
  if (isAuthed) {
    showDashboard();
  } else {
    if (token) {
      localStorage.removeItem('admin_token');
      token = null;
    }
    showLogin();
  }
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = passwordInput.value;
  if (!password) return;

  loginBtn.disabled = true;
  loginBtnText.textContent = 'Memeriksa...';
  loginSpinner.style.display = 'inline-block';
  loginError.style.display = 'none';

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Password salah');
    }
    token = data.token;
    localStorage.setItem('admin_token', token);
    showToast('Login berhasil! Selamat datang admin 👋');
    passwordInput.value = '';
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.style.display = 'block';
    showToast(err.message, true);
  } finally {
    loginBtn.disabled = false;
    loginBtnText.textContent = 'Masuk →';
    loginSpinner.style.display = 'none';
  }
});

logoutBtn.addEventListener('click', async () => {
  try {
    await fetch('/api/admin/logout', {
      method: 'POST',
      headers: getAuthHeaders()
    });
  } catch {}
  localStorage.removeItem('admin_token');
  token = null;
  showToast('Logout berhasil');
  showLogin();
});

refreshBtn.addEventListener('click', () => {
  loadMessages();
  showToast('Memperbarui pesan...');
});

async function loadMessages() {
  messagesList.innerHTML = `
    <div class="skeleton shimmer"></div>
    <div class="skeleton shimmer" style="opacity:0.7"></div>
    <div class="skeleton shimmer" style="opacity:0.4"></div>
  `;
  try {
    const res = await fetch('/api/messages', {
      headers: getAuthHeaders()
    });
    if (res.status === 401) {
      showToast('Sesi habis, silakan login lagi', true);
      localStorage.removeItem('admin_token');
      token = null;
      showLogin();
      return;
    }
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    const messages = data.data;
    messagesCount.textContent = `${messages.length} pesan`;
    totalCount.textContent = messages.length;
    if (messages.length > 0) {
      latestTime.textContent = `${timeAgo(messages[0].created_at)} • ${formatDate(messages[0].created_at)}`;
    } else {
      latestTime.textContent = '—';
    }

    if (messages.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📭</div>
          <h3>Belum ada pesan</h3>
          <p>Ketika member mengirim feedback, pesan akan muncul di sini.</p>
        </div>
      `;
      return;
    }

    messagesList.innerHTML = messages.map((msg, idx) => `
      <div class="message-card">
        <div class="message-top">
          <div class="message-meta">
            <span class="message-id">#${msg.id}</span>
            <span class="message-date">${formatDate(msg.created_at)} • ${timeAgo(msg.created_at)}</span>
          </div>
        </div>
        <div class="message-content">${escapeHtml(msg.message)}</div>
        <div class="message-actions">
          <button class="btn btn-danger" onclick="deleteMessage(${msg.id})">🗑️ Hapus</button>
        </div>
      </div>
    `).join('');

  } catch (err) {
    messagesList.innerHTML = `
      <div class="empty-state" style="border-color: rgba(239,68,68,0.3);">
        <div class="empty-state-icon">⚠️</div>
        <h3>Gagal memuat pesan</h3>
        <p>${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

window.deleteMessage = async (id) => {
  if (!confirm(`Hapus pesan #${id}? Tindakan ini tidak bisa dibatalkan.`)) return;
  try {
    const res = await fetch(`/api/messages/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.message);
    showToast('Pesan dihapus');
    loadMessages();
  } catch (err) {
    showToast(err.message || 'Gagal menghapus', true);
  }
};

init();
