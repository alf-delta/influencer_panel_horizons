// ============================================================
// Horizons Influencer Panel — UI Utilities
// Shared helpers used across views
// ============================================================

// ---- Avatar (unavatar.io + ссылка на профиль) ----

const AVATAR_COLORS = [
  ['#1A1A2E', '#4A4A8A'],
  ['#7C3AED', '#A78BFA'],
  ['#B8912E', '#D4A843'],
  ['#065F46', '#34D399'],
  ['#9A3412', '#FB923C'],
  ['#1E40AF', '#60A5FA'],
  ['#831843', '#F472B6'],
  ['#166534', '#4ADE80'],
  ['#7E22CE', '#C084FC'],
  ['#92400E', '#FCD34D'],
];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const [from, to] = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return `linear-gradient(135deg, ${from}, ${to})`;
}

export function avatarInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

// Аватарка: если есть username — грузит фото из Instagram через unavatar.io,
// при ошибке fallback на инициалы. Клик открывает профиль в новой вкладке.
export function avatar(name = '', username = '', size = 'md') {
  const cls = `avatar avatar-${size}`;
  const initials = avatarInitials(name);

  const bg = avatarColor(name);

  if (username) {
    const igUrl = `https://instagram.com/${username.replace(/^@/, '')}`;
    return `
      <a href="${igUrl}" target="_blank" rel="noopener" title="@${username} в Instagram"
         class="${cls}" style="display:inline-flex;text-decoration:none;background:${bg};">
        ${initials}
      </a>`;
  }

  return `<div class="${cls}" style="background:${bg}">${initials}</div>`;
}

// ---- Badges ----

export function tierBadge(tier) {
  const map = {
    Gold:    'badge-gold',
    Silver:  'badge-silver',
    Out:     'badge-out',
    Unrated: 'badge-unrated',
  };
  return `<span class="badge ${map[tier] || 'badge-unrated'}">${tier || 'Unrated'}</span>`;
}

export function zoneBadge(zone) {
  const map = { A: 'badge-zone-a', B: 'badge-zone-b', C: 'badge-zone-c' };
  return `<span class="badge ${map[zone] || 'badge-zone-c'}">Zone ${zone || 'C'}</span>`;
}

export function platformBadge(platform) {
  const map = {
    instagram: ['badge-ig', 'IG'],
    tiktok:    ['badge-tiktok', 'TT'],
    youtube:   ['badge-yt', 'YT'],
  };
  const [cls, label] = map[(platform || '').toLowerCase()] || ['badge-unrated', platform || '—'];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function statusBadge(status) {
  const map = {
    candidate:    'badge-candidate',
    outreach:     'badge-outreach',
    active:       'badge-active',
    in_production:'badge-production',
    review:       'badge-review',
    complete:     'badge-complete',
    archived:     'badge-archived',
  };
  const labels = {
    candidate: 'Candidate', outreach: 'Outreach', active: 'Onboarding',
    in_production: 'In Production', review: 'Review', complete: 'Complete', archived: 'Archived',
  };
  return `<span class="badge ${map[status] || ''}">${labels[status] || status || '—'}</span>`;
}

// ---- Score Bar ----

export function scoreBar(score, showLabel = false) {
  const pct   = Math.min(100, Math.max(0, Number(score) || 0));
  const color = pct >= 75 ? 'var(--success)' : pct >= 45 ? 'var(--gold)' : pct >= 20 ? 'var(--muted)' : 'var(--danger)';

  return `
    <div class="score-bar-wrap">
      <div class="score-bar-track">
        <div class="score-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="score-val">${score ?? '—'}</span>
    </div>`;
}

// ---- Date ----

export function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---- Toast ----

export function toast(msg, type = 'info', duration = 4000) {
  const icons = { success: '✓', error: '✕', info: '◈' };
  const stack = document.getElementById('toasts');
  if (!stack) return;

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="toast-icon">${icons[type] || '◈'}</span>
    <span class="toast-msg">${msg}</span>
    <button class="toast-dismiss">✕</button>`;

  stack.appendChild(el);

  const dismiss = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.transition = 'all 0.2s';
    setTimeout(() => el.remove(), 200);
  };

  el.querySelector('.toast-dismiss').addEventListener('click', dismiss);
  setTimeout(dismiss, duration);
}

// ---- Modal ----

export function openModal(html) {
  const backdrop = document.getElementById('modal-backdrop');
  const wrap     = document.getElementById('modal-wrap');
  const modal    = document.getElementById('modal');

  modal.innerHTML = html;
  backdrop.classList.remove('hidden');
  wrap.classList.remove('hidden');

  // Close buttons
  modal.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });

  // Click outside
  backdrop.onclick = closeModal;
  wrap.onclick = e => { if (e.target === wrap) closeModal(); };
}

export function closeModal() {
  document.getElementById('modal-backdrop')?.classList.add('hidden');
  document.getElementById('modal-wrap')?.classList.add('hidden');
}
