// ============================================================
// Horizons Influencer Panel — Main App Controller
// ============================================================

import { isConfigured } from './config.js';
import { initDB }        from './db.js';
import { toast }         from './ui.js';
import { getSession, signIn, signUp, signOut, onAuthChange } from './auth.js';
import { render as renderDashboard }  from './views/dashboard.js';
import { render as renderPipeline }   from './views/pipeline.js';
import { render as renderCandidates } from './views/candidates.js';
import { render as renderSettings }   from './views/settings.js';
import { render as renderSearch }      from './views/search.js';
import { render as renderGuide }       from './views/guide.js';
import { open as openInfluencerDrawer, closeDrawer } from './views/influencer.js';

// ---- State ----

const state = {
  view: 'dashboard',
  drawerOpen: false,
  openId: null,
};

let _booted = false;

// ---- Login screen ----

function showLoginScreen() {
  document.getElementById('app').style.display = 'none';
  let wrap = document.getElementById('login-screen');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'login-screen';
    document.body.appendChild(wrap);
  }
  wrap.style.display = 'flex';
  let mode = 'signin'; // 'signin' | 'signup'

  function renderForm() {
    wrap.innerHTML = `
      <div class="login-card">
        <div class="login-brand">
          <span class="brand-mark">◈</span>
          <div>
            <div class="brand-name" style="font-size:18px">Horizons</div>
            <div class="brand-sub">Influencer Panel</div>
          </div>
        </div>
        <div class="login-tabs">
          <button class="login-tab ${mode === 'signin' ? 'active' : ''}" data-mode="signin">Sign in</button>
          <button class="login-tab ${mode === 'signup' ? 'active' : ''}" data-mode="signup">Create account</button>
        </div>
        <div id="login-error" class="login-error" style="display:none"></div>
        <div id="login-success" class="login-success" style="display:none"></div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="input" id="login-email" type="email" placeholder="you@horizons.com" autocomplete="email">
        </div>
        <div class="form-group" style="margin-top:12px">
          <label class="form-label">Password</label>
          <input class="input" id="login-password" type="password" placeholder="••••••••"
            autocomplete="${mode === 'signin' ? 'current-password' : 'new-password'}">
        </div>
        <button class="btn btn-primary" id="login-btn" style="width:100%;margin-top:20px">
          ${mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </div>`;

    wrap.querySelectorAll('.login-tab').forEach(tab => {
      tab.addEventListener('click', () => { mode = tab.dataset.mode; renderForm(); });
    });

    const btn     = wrap.querySelector('#login-btn');
    const errEl   = wrap.querySelector('#login-error');
    const okEl    = wrap.querySelector('#login-success');
    const emailEl = wrap.querySelector('#login-email');
    const passEl  = wrap.querySelector('#login-password');

    function showError(msg) { errEl.textContent = msg; errEl.style.display = 'block'; okEl.style.display = 'none'; }
    function showOk(msg)    { okEl.textContent = msg;  okEl.style.display = 'block'; errEl.style.display = 'none'; }

    async function doSubmit() {
      const email    = emailEl.value.trim();
      const password = passEl.value;
      if (!email || !password) { showError('Enter email and password'); return; }
      btn.disabled = true;
      btn.textContent = mode === 'signin' ? 'Signing in…' : 'Creating account…';
      errEl.style.display = 'none';
      try {
        if (mode === 'signin') {
          await signIn(email, password);
        } else {
          const result = await signUp(email, password);
          if (result.needsConfirmation) {
            showOk('Check your email to confirm your account, then sign in.');
            btn.disabled = false;
            btn.textContent = 'Create account';
            return;
          }
        }
      } catch (err) {
        showError(err.message || 'Something went wrong');
        btn.disabled = false;
        btn.textContent = mode === 'signin' ? 'Sign in' : 'Create account';
      }
    }

    btn.addEventListener('click', doSubmit);
    passEl.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
    emailEl.addEventListener('keydown', e => { if (e.key === 'Enter') passEl.focus(); });
  }

  renderForm();
}

function hideLoginScreen() {
  const wrap = document.getElementById('login-screen');
  if (wrap) wrap.style.display = 'none';
  document.getElementById('app').style.display = '';
}

// ---- Boot ----

async function boot() {
  setStatus('connecting', 'Connecting…');

  if (!isConfigured()) {
    hideLoginScreen();
    setStatus('offline', 'Not configured');
    navigate('settings');
    return;
  }

  const session = await getSession();
  if (!session) {
    showLoginScreen();
    return;
  }

  hideLoginScreen();
  _booted = true;

  const ok = await initDB();
  if (ok) {
    setStatus('connected', session.user?.email || 'Connected');
  } else {
    setStatus('offline', 'DB error — check Settings');
    toast('Supabase connection failed. Check Settings.', 'error');
  }

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

    case 'search':
      renderSearch(container, callbacks);
      break;

    case 'guide':
      renderGuide(container);
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

// ---- Logout button ----

document.getElementById('btn-logout')?.addEventListener('click', async () => {
  await signOut();
  showLoginScreen();
});

// ---- Auth state listener (only reacts to sign-in after login screen) ----

onAuthChange(session => {
  if (session && !_booted) {
    _booted = true;
    boot();
  } else if (!session && _booted) {
    _booted = false;
    showLoginScreen();
  }
});

// ---- Start ----

boot();
