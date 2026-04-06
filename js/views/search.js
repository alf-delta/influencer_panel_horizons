// ============================================================
// Horizons Influencer Panel — kone.vc AI Search View
// ============================================================

import { bulkCreateInfluencers, getExistingUsernames } from '../db.js';
import { avatar, platformBadge, zoneBadge, toast } from '../ui.js';
import { computeGeoZone, computeImportScore } from '../scoring.js';

const BRIDGE_URL = 'http://localhost:5050';

// Horizons target states
const TARGET_STATES = [
  'South Carolina',
  'Texas',
  'California',
  'Tennessee',
  'Ohio',
];

// Major cities per target state
const STATE_CITIES = {
  'South Carolina': ['Columbia', 'Charleston', 'Greenville', 'Spartanburg', 'Myrtle Beach', 'Rock Hill', 'Charlotte', 'Concord', 'Gastonia', 'Fort Mill', 'Huntersville', 'Kannapolis'],
  'Texas':          ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth', 'El Paso', 'Arlington', 'Plano'],
  'California':     ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Fresno'],
  'Tennessee':      ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro'],
  'Ohio':           ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
};

export async function render(container, { navigate }) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">AI Search</div>
        <div class="page-subtitle">Find influencers via kone.vc + Claude AI</div>
      </div>
      <div id="bridge-status" class="bridge-status checking">
        <span class="bridge-dot"></span>
        <span class="bridge-label">Checking bridge…</span>
      </div>
    </div>

    <!-- ── Row 1: Geography card ── -->
    <div class="card search-geo-card">
      <div class="search-geo-header">
        <span class="form-section-label" style="margin:0">Locations — select states to search</span>
        <label class="search-noloc-toggle">
          <input type="checkbox" id="include-no-loc" checked>
          <span>Include influencers without listed city</span>
        </label>
      </div>

      <div class="states-grid" id="states-grid">
        ${TARGET_STATES.map(state => {
          const entireLabel = state === 'South Carolina'
            ? 'All SC + S. North Carolina'
            : 'Entire state';
          return `
          <div class="state-tile" id="tile-${state.replace(/\s/g,'-')}">
            <label class="state-tile-header">
              <input type="checkbox" class="state-cb" value="${state}">
              <span class="state-tile-name">${state}</span>
            </label>
            <div class="state-tile-cities">
              <label class="city-chip entire-chip">
                <input type="checkbox" class="entire-cb" data-state="${state}">
                <span>${entireLabel}</span>
              </label>
              ${(STATE_CITIES[state] || []).map(city => `
                <label class="city-chip">
                  <input type="checkbox" class="city-cb" data-state="${state}" value="${city}">
                  <span>${city}</span>
                </label>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- ── Row 2: Filters strip + button ── -->
    <div class="card search-filters-strip">

      <div class="search-filter-group">
        <div class="form-section-label">Platforms</div>
        <div class="platform-checks">
          <label class="plat-check"><input type="checkbox" class="plat-cb" value="instagram" checked><span>Instagram</span></label>
          <label class="plat-check"><input type="checkbox" class="plat-cb" value="tiktok"><span>TikTok</span></label>
          <label class="plat-check"><input type="checkbox" class="plat-cb" value="youtube"><span>YouTube</span></label>
        </div>
      </div>

      <div class="search-filter-group search-filter-grow">
        <label class="form-section-label" for="s-category">Niche / category</label>
        <input id="s-category" class="form-input" type="text" placeholder="lifestyle, travel, outdoor, couples…">
      </div>

      <div class="search-filter-group">
        <div class="form-section-label">Followers</div>
        <div style="display:flex;gap:6px;align-items:center">
          <input id="s-fmin" class="form-input" type="number" min="0" placeholder="Min" style="width:90px">
          <span class="text-muted">–</span>
          <input id="s-fmax" class="form-input" type="number" min="0" placeholder="Max" style="width:90px">
        </div>
      </div>

      <div class="search-filter-group">
        <label class="form-section-label" for="s-limit">Limit</label>
        <select id="s-limit" class="form-select" style="width:100px">
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="500" selected>500</option>
          <option value="0">No limit</option>
        </select>
      </div>

      <div class="search-filter-group search-filter-btn">
        <button id="search-btn" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Search with AI
        </button>
      </div>

    </div>

    <!-- ── Row 3: Results ── -->
    <div class="card search-results-area">
      <div id="search-state-empty" class="search-empty">
        <div style="font-size:32px;margin-bottom:12px;opacity:.4">◈</div>
        <div style="font-size:14px;font-weight:500;margin-bottom:6px">Ready to search</div>
        <div class="text-muted text-sm">Select states and platforms above, then click Search with AI.</div>
      </div>
      <div id="search-state-loading" class="search-loading hidden">
        <div class="spinner" style="width:28px;height:28px;border-width:3px"></div>
        <div style="margin-top:14px;font-size:13px;color:var(--muted)">Claude is searching kone.vc…</div>
      </div>
      <div id="search-results" class="hidden"></div>
    </div>`;

  checkBridge();
  bindForm(navigate);
}


// ── Form interactions ──────────────────────────────────────

function bindForm(navigate) {
  document.getElementById('states-grid').addEventListener('change', e => {
    const target = e.target;
    const tile = target.closest('.state-tile');
    if (!tile) return;

    // State checkbox — activate/deactivate tile, auto-check "Entire state"
    if (target.classList.contains('state-cb')) {
      tile.classList.toggle('state-tile-active', target.checked);
      if (target.checked) {
        // Auto-check "Entire state", uncheck all cities
        tile.querySelector('.entire-cb').checked = true;
        tile.querySelectorAll('.city-cb').forEach(cb => cb.checked = false);
      } else {
        tile.querySelector('.entire-cb').checked = false;
        tile.querySelectorAll('.city-cb').forEach(cb => cb.checked = false);
      }
    }

    // "Entire state" chip — uncheck all individual cities
    if (target.classList.contains('entire-cb') && target.checked) {
      tile.querySelectorAll('.city-cb').forEach(cb => cb.checked = false);
    }

    // Individual city chip — uncheck "Entire state"
    if (target.classList.contains('city-cb') && target.checked) {
      tile.querySelector('.entire-cb').checked = false;
    }
  });

  document.getElementById('search-btn').addEventListener('click', () => runSearch(navigate));
}


// ── Bridge health ──────────────────────────────────────────

async function checkBridge() {
  const el = document.getElementById('bridge-status');
  if (!el) return;
  try {
    const res = await fetch(`${BRIDGE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    if (data.anthropic_key_set) {
      el.className = 'bridge-status online';
      el.innerHTML = `<span class="bridge-dot"></span><span class="bridge-label">Bridge ready</span>`;
    } else {
      el.className = 'bridge-status warn';
      el.innerHTML = `<span class="bridge-dot"></span><span class="bridge-label">Bridge up — API key missing</span>`;
    }
  } catch {
    el.className = 'bridge-status offline';
    el.innerHTML = `<span class="bridge-dot"></span><span class="bridge-label">Bridge offline — run search_server.py</span>`;
  }
}


// ── Search ─────────────────────────────────────────────────

async function runSearch(navigate) {
  const states   = [...document.querySelectorAll('.state-cb:checked')].map(cb => cb.value);
  // Only collect cities from states where "Entire state" is NOT checked
  const entireStates = new Set([...document.querySelectorAll('.entire-cb:checked')].map(cb => cb.dataset.state));
  const cities   = [...document.querySelectorAll('.city-cb:checked')]
    .filter(cb => !entireStates.has(cb.dataset.state))
    .map(cb => cb.value);
  const platforms = [...document.querySelectorAll('.plat-cb:checked')].map(cb => cb.value);
  const include_no_location = document.getElementById('include-no-loc').checked;
  const category     = document.getElementById('s-category').value.trim();
  const followers_min = parseInt(document.getElementById('s-fmin').value) || 0;
  const followers_max = parseInt(document.getElementById('s-fmax').value) || 0;
  const limitVal     = parseInt(document.getElementById('s-limit').value);
  const limit        = isNaN(limitVal) ? 500 : limitVal;

  if (!platforms.length) {
    toast('Select at least one platform', 'info');
    return;
  }

  console.log('[search] sending:', { states, cities, platforms, include_no_location, category, limit });

  showState('loading');
  document.getElementById('search-btn').disabled = true;

  try {
    const res = await fetch(`${BRIDGE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        states, cities, platforms, include_no_location,
        category, followers_min, followers_max, limit,
      }),
      signal: AbortSignal.timeout(300_000), // 5 min — covers slow kone.vc
    });

    const data = await res.json();
    if (!data.success) {
      if (data.retryable) {
        showRetry(data.error, () => runSearch(navigate));
      } else {
        showEmpty(`Error: ${data.error}`);
        toast(data.error, 'error');
      }
      return;
    }
    if (!data.contacts?.length) {
      showEmpty('No results. Try broader criteria or more states.');
      return;
    }

    await renderResults(data.contacts, navigate);

  } catch (err) {
    showEmpty(`Error: ${err.message}`);
    toast(err.message, 'error');
  } finally {
    document.getElementById('search-btn').disabled = false;
  }
}


// ── Results table ──────────────────────────────────────────

async function renderResults(contacts, navigate) {
  showState('results');

  let existingSet = new Set();
  try { existingSet = await getExistingUsernames(); } catch { /* offline — skip */ }

  const scored = contacts.map(c => {
    const geo_zone     = computeGeoZone(c.location || '');
    const import_score = computeImportScore({
      geo_zone,
      engagement_rate: c.er || 0,
      followers:       c.followers || 0,
      content_text:    `${c.category || ''} ${c.description || ''}`,
    });
    const key = `${(c.platform || 'instagram').toLowerCase()}:${(c.username || '').toLowerCase()}`;
    const already_added = existingSet.has(key);
    return { ...c, geo_zone, import_score, already_added };
  });

  // Sort by score descending
  scored.sort((a, b) => b.import_score - a.import_score);

  const wrap = document.getElementById('search-results');
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <div>
        <span style="font-weight:600;font-size:15px">${scored.length} result${scored.length !== 1 ? 's' : ''}</span>
        <span class="text-muted text-sm" style="margin-left:8px">sorted by score · select to import</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
          <input type="checkbox" id="sel-all" checked> All
        </label>
        <button id="import-btn" class="btn btn-primary" style="padding:6px 18px">Import selected</button>
      </div>
    </div>

    <div style="overflow-x:auto">
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <thead><tr>
          <th style="${th()}"><input type="checkbox" id="th-check" checked></th>
          <th style="${th()}">Influencer</th>
          <th style="${th()}">Platform</th>
          <th style="${th()}">Email</th>
          <th style="${th()}">Location</th>
          <th style="${th('right')}">Followers</th>
          <th style="${th('right')}">ER %</th>
          <th style="${th('right')}">Score</th>
        </tr></thead>
        <tbody>${scored.map((c, i) => rowHtml(c, i)).join('')}
        <tr id="dupes-summary" style="display:none"><td colspan="8" style="padding:8px 10px;font-size:12px;color:var(--muted);text-align:center"></td></tr>
      </table>
    </div>`;

  // Uncheck already-added rows
  scored.forEach((c, i) => {
    if (c.already_added) {
      const cb = document.querySelector(`.row-check[data-idx="${i}"]`);
      if (cb) cb.checked = false;
    }
  });
  const dupeCount = scored.filter(c => c.already_added).length;
  if (dupeCount) {
    const row = document.getElementById('dupes-summary');
    row.style.display = '';
    row.querySelector('td').textContent = `${dupeCount} already in panel — unchecked automatically`;
  }

  // Select-all
  const syncAll = checked => document.querySelectorAll('.row-check').forEach(cb => cb.checked = checked);
  document.getElementById('sel-all').addEventListener('change', e => syncAll(e.target.checked));
  document.getElementById('th-check').addEventListener('change', e => {
    document.getElementById('sel-all').checked = e.target.checked;
    syncAll(e.target.checked);
  });

  document.getElementById('import-btn').addEventListener('click', () => importSelected(scored, navigate));
}

const th = (align = 'left') =>
  `text-align:${align};padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)`;

const td = (extra = '') =>
  `padding:9px 10px;border-bottom:1px solid var(--divider);${extra}`;

function rowHtml(c, i) {
  const fStr  = c.followers ? Number(c.followers).toLocaleString() : '—';
  const erStr = c.er        ? `${parseFloat(c.er).toFixed(1)}%`    : '—';
  const locStr = c.location || '<span class="text-muted">no city listed</span>';
  const scoreColor = c.import_score >= 75 ? 'var(--success)'
                   : c.import_score >= 45 ? 'var(--gold)' : 'var(--muted)';
  const rowStyle = c.already_added ? 'opacity:.55;background:var(--divider)' : '';

  return `<tr style="${rowStyle}">
    <td style="${td()}"><input type="checkbox" class="row-check" data-idx="${i}" checked></td>
    <td style="${td()}">
      <div style="display:flex;align-items:center;gap:9px">
        ${avatar(c.name || '', c.username || '', 'sm', c.platform)}
        <div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-weight:500">${esc(c.name || '—')}</span>
            ${c.already_added ? '<span style="font-size:10px;font-weight:600;color:var(--muted);background:var(--card-border);border-radius:4px;padding:1px 5px">IN PANEL</span>' : ''}
          </div>
          <div class="text-muted text-xs">@${esc(c.username || '—')}</div>
        </div>
      </div>
    </td>
    <td style="${td()}">${platformBadge(c.platform || 'instagram')}</td>
    <td style="${td()}">
      ${c.email ? `<a href="mailto:${esc(c.email)}" style="font-size:12px;color:var(--accent)">${esc(c.email)}</a>` : '<span class="text-muted text-xs">—</span>'}
    </td>
    <td style="${td()}">
      <div style="font-size:12px">${locStr}</div>
      ${zoneBadge(c.geo_zone)}
    </td>
    <td style="${td('text-align:right')}">${fStr}</td>
    <td style="${td('text-align:right')}">${erStr}</td>
    <td style="${td('text-align:right;font-weight:700')}">
      <span style="color:${scoreColor}">${c.import_score}</span>
    </td>
  </tr>`;
}


// ── Import ─────────────────────────────────────────────────

async function importSelected(scored, navigate) {
  const selected = scored.filter((_, i) =>
    document.querySelector(`.row-check[data-idx="${i}"]`)?.checked
  );

  if (!selected.length) { toast('Select at least one contact', 'info'); return; }

  const btn = document.getElementById('import-btn');
  btn.disabled = true;
  btn.textContent = 'Importing…';

  try {
    const rows = selected.map(c => ({
      name:            c.name || '',
      username:        c.username || '',
      email:           c.email || '',
      platform:        c.platform || 'instagram',
      location:        c.location || '',
      followers:       c.followers || 0,
      engagement_rate: c.er || 0,
      category:        c.category || '',
      bio_keywords:    c.description || '',
    }));

    const { created, skipped } = await bulkCreateInfluencers(rows);
    toast(
      `Imported ${created} influencer${created !== 1 ? 's' : ''}` +
      (skipped ? ` · ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : ''),
      'success'
    );
    navigate('candidates');
  } catch (err) {
    toast(`Import failed: ${err.message}`, 'error');
    btn.disabled = false;
    btn.textContent = 'Import selected';
  }
}


// ── Helpers ────────────────────────────────────────────────

function showState(state) {
  document.getElementById('search-state-empty').classList.add('hidden');
  document.getElementById('search-state-loading').classList.add('hidden');
  document.getElementById('search-results').classList.add('hidden');
  if (state === 'loading')  document.getElementById('search-state-loading').classList.remove('hidden');
  else if (state === 'results') document.getElementById('search-results').classList.remove('hidden');
  else document.getElementById('search-state-empty').classList.remove('hidden');
}

function showEmpty(msg) {
  showState('empty');
  document.getElementById('search-state-empty').innerHTML = `
    <div style="font-size:28px;margin-bottom:12px;opacity:.4">◈</div>
    <div class="text-muted text-sm">${esc(msg)}</div>`;
}

function showRetry(msg, retryFn) {
  showState('empty');
  const el = document.getElementById('search-state-empty');
  el.innerHTML = `
    <div style="font-size:28px;margin-bottom:12px">⚠</div>
    <div style="font-weight:500;margin-bottom:6px;font-size:14px">kone.vc не отвечает</div>
    <div class="text-muted text-sm" style="margin-bottom:16px">${esc(msg)}</div>
    <button id="retry-btn" class="btn btn-primary" style="padding:8px 24px">Try again</button>`;
  el.querySelector('#retry-btn').addEventListener('click', retryFn);
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
