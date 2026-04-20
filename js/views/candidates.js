// ============================================================
// Horizons Influencer Panel — Candidates Table + CSV Import
// ============================================================

import { getInfluencers, bulkCreateInfluencers, createInfluencer, bulkUpdateStatus, bulkDelete } from '../db.js';
import { computeGeoZone, computeImportScore } from '../scoring.js';
import { avatar, avatarInitials, tierBadge, zoneBadge, platformBadge, scoreBar, statusBadge, toast, openModal, closeModal } from '../ui.js';

let _state = { influencers: [], sort: 'import_score', dir: 'desc', filters: {} };

export async function render(container, { openInfluencer, openId }) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Candidates</div>
        <div class="page-subtitle">Full influencer list — import, search, filter</div>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline btn-sm" id="btn-add-manual">+ Add manually</button>
        <button class="btn btn-gold btn-sm" id="btn-import-csv">⬆ Import CSV</button>
      </div>
    </div>
    <div class="candidates-body">
      <div class="filter-bar">
        <input class="filter-search" id="f-search" placeholder="Search by name…" value="">
        <select class="filter-select" id="f-tier">
          <option value="">All tiers</option>
          <option>Gold</option><option>Silver</option><option>Out</option><option>Unrated</option>
        </select>
        <select class="filter-select" id="f-location">
          <option value="">All locations</option>
          <option value="South Carolina">South Carolina</option>
          <option value="Texas">Texas</option>
          <option value="California">California</option>
          <option value="Tennessee">Tennessee</option>
          <option value="Ohio">Ohio</option>
        </select>
        <select class="filter-select" id="f-zone">
          <option value="">All zones</option>
          <option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option>
        </select>
        <select class="filter-select" id="f-platform">
          <option value="">All platforms</option>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
        </select>
        <select class="filter-select" id="f-status">
          <option value="">All stages</option>
          <option value="candidate">Candidate</option>
          <option value="outreach">Outreach</option>
          <option value="active">Onboarding</option>
          <option value="in_production">In Production</option>
          <option value="review">Review</option>
          <option value="complete">Complete</option>
          <option value="archived">Archived</option>
        </select>
        <div class="filter-sep"></div>
        <span class="text-muted text-sm" id="f-count"></span>
      </div>
      <div id="bulk-bar" class="bulk-bar" style="display:none">
        <span id="bulk-count" class="bulk-count"></span>
        <div class="bulk-actions">
          <select id="bulk-status" class="filter-select" style="font-size:12px">
            <option value="">Move to stage…</option>
            <option value="candidate">Candidate</option>
            <option value="outreach">Outreach</option>
            <option value="active">Onboarding</option>
            <option value="in_production">In Production</option>
            <option value="review">Review</option>
            <option value="complete">Complete</option>
            <option value="archived">Archive</option>
          </select>
          <button class="btn btn-danger btn-sm" id="bulk-delete">Delete selected</button>
        </div>
      </div>
      <div id="table-wrap" class="table-wrap">
        <div class="loading-overlay"><div class="spinner"></div> Loading…</div>
      </div>
    </div>`;

  await loadTable(container, openInfluencer);
  bindFilterEvents(container, openInfluencer);
  bindImportEvents(container, openInfluencer);

  if (openId) {
    setTimeout(() => openInfluencer(openId), 100);
  }
}

async function loadTable(container, openInfluencer) {
  try {
    const data = await getInfluencers(_state.filters);
    _state.influencers = sortInfluencers(data, _state.sort, _state.dir);
    renderTable(container, openInfluencer);
  } catch (err) {
    container.querySelector('#table-wrap').innerHTML =
      `<div class="loading-overlay" style="color:var(--danger)">⚠ ${err.message}</div>`;
  }
}

function renderTable(container, openInfluencer) {
  const list = _state.influencers;
  const wrap = container.querySelector('#table-wrap');
  container.querySelector('#f-count').textContent = `${list.length} result${list.length !== 1 ? 's' : ''}`;

  if (!list.length) {
    wrap.innerHTML = '<div class="table-empty">No influencers found. Try adjusting filters or import a CSV.</div>';
    return;
  }

  const cols = [
    { key: '_check',          label: '',            sortable: false },
    { key: 'name',            label: 'Influencer',  sortable: true },
    { key: 'platform',        label: 'Platform',    sortable: true },
    { key: 'followers',       label: 'Followers',   sortable: true },
    { key: 'engagement_rate', label: 'ER %',        sortable: true },
    { key: 'location_raw',    label: 'Location',    sortable: false },
    { key: 'geo_zone',        label: 'Zone',        sortable: true },
    { key: 'import_score',    label: 'Score',       sortable: true },
    { key: 'tier',            label: 'Tier',        sortable: true },
    { key: 'status',          label: 'Stage',       sortable: true },
    { key: '_actions',        label: '',            sortable: false },
  ];

  wrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th style="width:36px;padding:6px 10px">
            <input type="checkbox" id="th-check-all" title="Select all">
          </th>
          ${cols.slice(1).map(c => `
            <th class="${c.sortable ? (_state.sort === c.key ? `sort-${_state.dir}` : '') : ''}"
                data-sort="${c.sortable ? c.key : ''}">
              ${c.label}
            </th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${list.map(inf => `
          <tr data-id="${inf.id}">
            <td style="padding:6px 10px" onclick="event.stopPropagation()">
              <input type="checkbox" class="row-cb" data-id="${inf.id}">
            </td>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                ${avatar(inf.name, inf.username, 'sm', inf.platform)}
                <div>
                  <div style="font-weight:600;font-size:13px">${inf.name}</div>
                  <div class="text-muted text-xs">@${inf.username || '—'}${inf.email ? ' · ' + inf.email : ''}</div>
                </div>
              </div>
            </td>
            <td>${platformBadge(inf.platform)}</td>
            <td style="font-weight:500">${fmtFollowers(inf.followers)}</td>
            <td><span style="font-weight:600">${inf.engagement_rate ?? '—'}%</span></td>
            <td style="font-size:12px;color:var(--text)">${inf.location_raw || '—'}</td>
            <td>${zoneBadge(inf.geo_zone)}</td>
            <td style="min-width:120px">${scoreBar(inf.import_score)}</td>
            <td>${tierBadge(inf.tier)}</td>
            <td>${statusBadge(inf.status)}</td>
            <td>
              <button class="btn btn-ghost btn-xs" data-open="${inf.id}" title="Open details">→</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table>`;

  // Checkbox logic
  const bulkBar   = container.querySelector('#bulk-bar');
  const bulkCount = container.querySelector('#bulk-count');

  function getSelected() {
    return [...wrap.querySelectorAll('.row-cb:checked')].map(cb => cb.dataset.id);
  }

  function updateBulkBar() {
    const ids = getSelected();
    if (ids.length > 0) {
      bulkBar.style.display = 'flex';
      bulkCount.textContent = `${ids.length} selected`;
    } else {
      bulkBar.style.display = 'none';
    }
  }

  wrap.querySelector('#th-check-all').addEventListener('change', e => {
    wrap.querySelectorAll('.row-cb').forEach(cb => cb.checked = e.target.checked);
    updateBulkBar();
  });

  wrap.querySelectorAll('.row-cb').forEach(cb => {
    cb.addEventListener('change', updateBulkBar);
  });

  // Bulk status change
  container.querySelector('#bulk-status').addEventListener('change', async e => {
    const status = e.target.value;
    if (!status) return;
    const ids = getSelected();
    if (!ids.length) { e.target.value = ''; return; }
    const sel = e.target;
    sel.disabled = true;
    try {
      await bulkUpdateStatus(ids, status);
      toast(`${ids.length} moved to "${status}"`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      sel.value = '';
      sel.disabled = false;
      container.querySelector('#bulk-bar').style.display = 'none';
      await loadTable(container, openInfluencer);
    }
  });

  // Bulk delete
  container.querySelector('#bulk-delete').addEventListener('click', async () => {
    const ids = getSelected();
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} influencer${ids.length !== 1 ? 's' : ''}? This cannot be undone.`)) return;
    const btn = container.querySelector('#bulk-delete');
    btn.disabled = true;
    btn.textContent = 'Deleting…';
    try {
      await bulkDelete(ids);
      toast(`${ids.length} deleted`, 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Delete selected';
      container.querySelector('#bulk-bar').style.display = 'none';
      await loadTable(container, openInfluencer);
    }
  });

  // Row clicks
  wrap.querySelectorAll('tbody tr').forEach(row => {
    row.addEventListener('click', e => {
      if (e.target.closest('[data-open]') || e.target.closest('.row-cb') || e.target.type === 'checkbox') return;
      openInfluencer(row.dataset.id);
    });
  });

  wrap.querySelectorAll('[data-open]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openInfluencer(btn.dataset.open);
    });
  });

  // Sort headers
  wrap.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      if (!th.dataset.sort) return;
      if (_state.sort === th.dataset.sort) {
        _state.dir = _state.dir === 'asc' ? 'desc' : 'asc';
      } else {
        _state.sort = th.dataset.sort;
        _state.dir = 'desc';
      }
      _state.influencers = sortInfluencers(_state.influencers, _state.sort, _state.dir);
      renderTable(container, openInfluencer);
    });
  });
}

function bindFilterEvents(container, openInfluencer) {
  const applyFilters = () => {
    _state.filters = {
      search:   container.querySelector('#f-search').value.trim() || undefined,
      tier:     container.querySelector('#f-tier').value || undefined,
      geo_zone: container.querySelector('#f-zone').value || undefined,
      platform: container.querySelector('#f-platform').value || undefined,
      status:   container.querySelector('#f-status').value || undefined,
      location: container.querySelector('#f-location').value || undefined,
    };
    loadTable(container, openInfluencer);
  };

  let debounce;
  container.querySelector('#f-search').addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(applyFilters, 300);
  });

  ['#f-tier','#f-zone','#f-platform','#f-status','#f-location'].forEach(id => {
    container.querySelector(id).addEventListener('change', applyFilters);
  });
}

function bindImportEvents(container, openInfluencer) {
  container.querySelector('#btn-import-csv').addEventListener('click', () => {
    showImportModal(container, openInfluencer);
  });

  container.querySelector('#btn-add-manual').addEventListener('click', () => {
    showAddModal(container, openInfluencer);
  });
}

// ---- CSV Import Modal ----

function showImportModal(container, openInfluencer) {
  let parsedRows = [];
  let csvFile = null;

  openModal(`
    <div class="modal-header">
      <div class="modal-title">Import CSV</div>
      <button class="btn btn-ghost btn-icon modal-close-btn">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-muted text-sm" style="margin-bottom:16px;line-height:1.6">
        Expected columns (from kone.vc or similar): <strong>name, username, email, platform, followers, engagement_rate, location, category, bio_keywords</strong>.<br>
        Header row required. Columns are auto-detected (case-insensitive).
      </p>
      <div class="upload-zone" id="upload-zone">
        <div class="upload-icon">📋</div>
        <div class="upload-label">Drop CSV here or click to upload</div>
        <div class="upload-hint">CSV, max 5MB</div>
        <div class="upload-filename" id="upload-filename"></div>
        <input type="file" id="csv-file-input" accept=".csv" style="display:none">
      </div>
      <div id="import-preview-wrap" style="margin-top:16px"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline modal-close-btn">Cancel</button>
      <button class="btn btn-gold" id="btn-confirm-import" disabled>Import</button>
    </div>`);

  const zone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('csv-file-input');
  const confirmBtn = document.getElementById('btn-confirm-import');

  zone.addEventListener('click', () => fileInput.click());

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    csvFile = file;
    document.getElementById('upload-filename').textContent = `✓ ${file.name}`;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        parsedRows = parseCSV(e.target.result);
        renderPreview(parsedRows);
        confirmBtn.disabled = parsedRows.length === 0;
        confirmBtn.textContent = `Import ${parsedRows.length} influencer${parsedRows.length !== 1 ? 's' : ''}`;
      } catch (err) {
        document.getElementById('import-preview-wrap').innerHTML =
          `<div style="color:var(--danger);font-size:13px">Parse error: ${err.message}</div>`;
      }
    };
    reader.readAsText(file);
  }

  function renderPreview(rows) {
    if (!rows.length) {
      document.getElementById('import-preview-wrap').innerHTML =
        '<div style="color:var(--muted);font-size:13px">No rows found.</div>';
      return;
    }
    const preview = rows.slice(0, 6);
    document.getElementById('import-preview-wrap').innerHTML = `
      <div class="text-muted text-sm" style="margin-bottom:8px">${rows.length} rows parsed — preview:</div>
      <div class="import-preview">
        <table>
          <thead><tr>
            <th>Name</th><th>Username</th><th>Platform</th>
            <th>Followers</th><th>ER%</th><th>Location</th><th>Zone*</th><th>Score*</th>
          </tr></thead>
          <tbody>
            ${preview.map(r => {
              const zone = computeGeoZone(r.location_raw || r.location || '');
              const score = computeImportScore({
                geo_zone: zone,
                engagement_rate: r.engagement_rate,
                followers: r.followers,
                content_text: [r.category, r.bio_keywords, r.username].filter(Boolean).join(' '),
              });
              return `<tr>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">${r.name || '—'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">@${r.username || '—'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">${r.platform || '—'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">${r.followers || '—'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">${r.engagement_rate || '—'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">${r.location || r.location_raw || '—'}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider)">${zone}</td>
                <td style="padding:6px 10px;border-bottom:1px solid var(--divider);font-weight:700">${score}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="text-xs text-muted" style="margin-top:6px">* Computed from your data. Final scores saved on import.</div>`;
  }

  confirmBtn.addEventListener('click', async () => {
    if (!parsedRows.length) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Importing…';
    try {
      const created = await bulkCreateInfluencers(parsedRows);
      document.getElementById('import-preview-wrap').innerHTML =
        `<div class="import-result">✓ Successfully imported ${created.length} influencer${created.length !== 1 ? 's' : ''}.</div>`;
      confirmBtn.textContent = 'Done';
      toast(`${created.length} influencers imported`, 'success');
      setTimeout(() => {
        closeModal();
        loadTable(container, openInfluencer);
      }, 1200);
    } catch (err) {
      toast(err.message, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = `Import ${parsedRows.length}`;
    }
  });
}

// ---- Add Manually Modal ----

function showAddModal(container, openInfluencer) {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Add Influencer</div>
      <button class="btn btn-ghost btn-icon modal-close-btn">✕</button>
    </div>
    <div class="modal-body">
      <div class="input-grid">
        <div class="form-group">
          <label class="form-label">Name *</label>
          <input class="input" id="m-name" placeholder="Full name">
        </div>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input class="input" id="m-username" placeholder="@handle">
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input class="input" id="m-email" type="email" placeholder="email@example.com">
        </div>
        <div class="form-group">
          <label class="form-label">Platform</label>
          <select class="input" id="m-platform">
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Followers</label>
          <input class="input" id="m-followers" type="number" placeholder="0">
        </div>
        <div class="form-group">
          <label class="form-label">Engagement Rate %</label>
          <input class="input" id="m-er" type="number" step="0.01" placeholder="0.00">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input class="input" id="m-location" placeholder="Charlotte, NC">
      </div>
      <div class="form-group">
        <label class="form-label">Content / Bio Keywords</label>
        <input class="input" id="m-keywords" placeholder="travel, lifestyle, couples, glamping…">
      </div>
      <div class="form-group">
        <label class="form-label">Notes</label>
        <textarea class="input" id="m-notes" rows="2" placeholder="Optional internal notes"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline modal-close-btn">Cancel</button>
      <button class="btn btn-primary" id="btn-save-manual">Save & Score</button>
    </div>`);

  document.getElementById('btn-save-manual').addEventListener('click', async () => {
    const name = document.getElementById('m-name').value.trim();
    if (!name) { toast('Name is required', 'error'); return; }

    const btn = document.getElementById('btn-save-manual');
    btn.disabled = true;
    btn.textContent = 'Saving…';

    try {
      const inf = await createInfluencer({
        name,
        username:        document.getElementById('m-username').value.trim(),
        email:           document.getElementById('m-email').value.trim(),
        platform:        document.getElementById('m-platform').value,
        followers:       document.getElementById('m-followers').value,
        engagement_rate: document.getElementById('m-er').value,
        location:        document.getElementById('m-location').value.trim(),
        bio_keywords:    document.getElementById('m-keywords').value.trim(),
        notes:           document.getElementById('m-notes').value.trim(),
      });
      toast(`${inf.name} added (score: ${inf.import_score})`, 'success');
      closeModal();
      await loadTable(container, openInfluencer);
      openInfluencer(inf.id);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Save & Score';
    }
  });
}

// ---- CSV Parser ----

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV needs at least a header row and one data row');

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().trim().replace(/[^a-z_]/g, '_'));
  const colMap = buildColMap(headers);

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = splitCSVLine(lines[i]);
    const row = {};
    for (const [field, idx] of Object.entries(colMap)) {
      if (idx !== -1) row[field] = (vals[idx] || '').trim();
    }
    if (row.name) rows.push(row);
  }
  return rows;
}

function buildColMap(headers) {
  const map = {
    name:            findCol(headers, ['name','full_name','creator_name','first_name']),
    username:        findCol(headers, ['username','handle','profile','instagram','account']),
    email:           findCol(headers, ['email','email_address','contact']),
    platform:        findCol(headers, ['platform','channel','network','social']),
    followers:       findCol(headers, ['followers','follower_count','subscribers']),
    engagement_rate: findCol(headers, ['engagement_rate','er','eng_rate','avg_engagement_rate','engagement','avg_er','er_pct','er_percent']),
    location:        findCol(headers, ['location','city','state','location_raw','geo']),
    category:        findCol(headers, ['category','niche','content_type','type']),
    bio_keywords:    findCol(headers, ['keywords','bio','bio_keywords','tags','description']),
    notes:           findCol(headers, ['notes','comment','comments']),
  };
  return map;
}

function findCol(headers, candidates) {
  // Pass 1: exact match
  for (const c of candidates) {
    const idx = headers.findIndex(h => h === c);
    if (idx !== -1) return idx;
  }
  // Pass 2: partial match — only if candidate is long enough (>=5 chars) to avoid
  // false positives like 'er' matching 'followers', 'name' matching 'username', etc.
  for (const c of candidates) {
    if (c.length < 5) continue;
    const idx = headers.findIndex(h => h.includes(c));
    if (idx !== -1) return idx;
  }
  return -1;
}

function splitCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ---- Helpers ----

function sortInfluencers(list, key, dir) {
  return [...list].sort((a, b) => {
    let va = a[key] ?? '';
    let vb = b[key] ?? '';
    if (typeof va === 'string') va = va.toLowerCase();
    if (typeof vb === 'string') vb = vb.toLowerCase();
    if (va < vb) return dir === 'asc' ? -1 : 1;
    if (va > vb) return dir === 'asc' ? 1 : -1;
    return 0;
  });
}

function fmtFollowers(n) {
  if (!n) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}
