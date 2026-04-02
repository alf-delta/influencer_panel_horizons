// ============================================================
// Horizons Influencer Panel — Main App Controller
// ============================================================

import { isConfigured } from './config.js';
import { initDB }        from './db.js';
import { toast }         from './ui.js';
import { render as renderDashboard }  from './views/dashboard.js';
import { render as renderPipeline }   from './views/pipeline.js';
import { render as renderCandidates } from './views/candidates.js';
import { render as renderSettings }   from './views/settings.js';
import { open as openInfluencerDrawer, closeDrawer } from './views/influencer.js';

// ---- State ----

const state = {
  view: 'dashboard',
  drawerOpen: false,
  openId: null,
};

// ---- Boot ----

async function boot() {
  setStatus('connecting', 'Connecting…');

  if (!isConfigured()) {
    setStatus('offline', 'Not configured');
    navigate('settings');
    return;
  }

  const ok = await initDB();
  if (ok) {
    setStatus('connected', 'Connected');
  } else {
    setStatus('offline', 'DB error — check Settings');
    toast('Supabase connection failed. Check Settings.', 'error');
  }

  // Read initial route from hash
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigate(hash);
}

// ---- Navigation ----

export function navigate(view, opts = {}) {
  state.view = view;
  state.openId = opts.openId || null;

  // Update URL hash
  window.history.replaceState(null, '', `#${view}`);

  // Highlight nav
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  // Close any open drawer on navigation
  if (!opts.openId) closeDrawer();

  renderView(view, opts);
}

function renderView(view, opts = {}) {
  const container = document.getElementById('view-container');
  container.innerHTML = '';

  const callbacks = {
    navigate,
    openInfluencer: (id) => openInfluencer(id),
    onRefresh: () => renderView(view),
  };

  switch (view) {
    case 'dashboard':
      renderDashboard(container, callbacks);
      break;

    case 'pipeline':
      renderPipeline(container, callbacks);
      break;

    case 'candidates':
      renderCandidates(container, { ...callbacks, openId: opts.openId });
      break;

    case 'settings':
      renderSettings(container, {
        onConfigSave: async () => {
          const ok = await initDB();
          if (ok) {
            setStatus('connected', 'Connected');
            toast('Connected to Supabase ✓', 'success');
            navigate('dashboard');
          }
        },
      });
      break;

    default:
      renderDashboard(container, callbacks);
  }
}

// ---- Influencer Drawer ----

function openInfluencer(id) {
  state.drawerOpen = true;
  state.openId = id;

  openInfluencerDrawer(id, {
    onClose: () => {
      state.drawerOpen = false;
      state.openId = null;
    },
    onRefresh: () => {
      // Refresh current view silently in background
      renderView(state.view);
    },
  });
}

// ---- Sidebar nav ----

document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.view));
});

// ---- Hash routing ----

window.addEventListener('hashchange', () => {
  const view = window.location.hash.replace('#', '') || 'dashboard';
  if (view !== state.view) navigate(view);
});

// ---- Status bar ----

function setStatus(state, label) {
  const dot   = document.getElementById('status-dot');
  const lbl   = document.getElementById('status-label');
  if (!dot || !lbl) return;

  dot.className   = `status-dot ${state}`;
  lbl.textContent = label;
}

// ---- Start ----

boot();
