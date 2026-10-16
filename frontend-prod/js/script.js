/* ============================================================
   Shared helpers: API client, auth storage, toasts, guards
   ============================================================ */

const API_BASE = window.API_BASE || '/api';

/* ----------------------------- Auth storage ----------------------------- */
const Auth = {
  getToken: () => localStorage.getItem('ams_token'),
  setToken: (t) => localStorage.setItem('ams_token', t),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem('ams_user') || 'null'); }
    catch { return null; }
  },
  setUser: (u) => localStorage.setItem('ams_user', JSON.stringify(u)),
  clear: () => { localStorage.removeItem('ams_token'); localStorage.removeItem('ams_user'); },
  isLoggedIn: () => !!localStorage.getItem('ams_token')
};

/* ----------------------------- API client ----------------------------- */
async function api(path, { method = 'GET', body, auth = true, raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && Auth.getToken()) headers.Authorization = `Bearer ${Auth.getToken()}`;

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (raw) return res;

  let data = null;
  try { data = await res.json(); } catch { data = {}; }

  if (!res.ok) {
    const err = new Error(data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* ----------------------------- Toasts ----------------------------- */
function toast(title, msg = '', type = 'info', timeout = 3600) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<div>${icons[type] || 'ℹ️'}</div><div><div class="t-title">${escapeHtml(title)}</div>${msg ? `<div class="t-msg">${escapeHtml(msg)}</div>` : ''}</div>`;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, timeout);
}

/* ----------------------------- Guards ----------------------------- */
function requireAuth(role) {
  const user = Auth.getUser();
  if (!Auth.isLoggedIn() || !user) {
    window.location.href = 'login.html';
    return null;
  }
  if (role && user.role !== role) {
    window.location.href = user.role === 'teacher' ? 'teacher-dashboard.html' : 'student-dashboard.html';
    return null;
  }
  return user;
}

function logout() {
  Auth.clear();
  window.location.href = 'index.html';
}

/* ----------------------------- Utilities ----------------------------- */
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = ['#4f46e5', '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#16a34a', '#0284c7', '#9333ea'];
function avatarColor(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function avatarHtml(name, seed) {
  return `<span class="avatar" style="background:${avatarColor(seed || name)}">${escapeHtml(initials(name))}</span>`;
}

function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function pctClass(p) { return p >= 75 ? 'good' : p >= 50 ? 'warn' : 'bad'; }

function progressHtml(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<span class="progress ${pctClass(p)}"><span style="width:${p}%"></span></span><span class="pct-label">${p}%</span>`;
}

/* ----------------------------- Misc UI ----------------------------- */
function toggleSidebar(force) {
  const sb = document.querySelector('.sidebar');
  const bd = document.querySelector('.sidebar-backdrop');
  if (!sb) return;
  const open = force === undefined ? !sb.classList.contains('open') : force;
  sb.classList.toggle('open', open);
  if (bd) bd.classList.toggle('show', open);
}

function openModal(id) { document.getElementById(id)?.classList.add('show'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('show'); }
