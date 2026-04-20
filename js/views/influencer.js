// ============================================================
// Horizons Influencer Panel — Influencer Detail Drawer
// Tabs: Overview | Iterations | Story Frames | Compliance
// ============================================================

import { getInfluencer, getIterations, createIteration, updateInfluencer, advanceStage, archiveInfluencer } from '../db.js';
import { computeReviewTier, STAGE_ORDER, STAGE_LABELS, STAGE_CHECKLISTS } from '../scoring.js';
import { SCENARIOS, PERSONALITIES, getFrames, getScenarioLabel } from '../frames.js';
import { avatar, tierBadge, zoneBadge, platformBadge, statusBadge, scoreBar, toast, openModal, closeModal } from '../ui.js';

let _activeTab = 'overview';

export async function open(id, { onClose, onRefresh }) {
  _activeTab = 'overview';
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');

  drawer.innerHTML = `<div class="loading-overlay"><div class="spinner"></div></div>`;
  drawer.classList.add('open');
  backdrop.classList.add('visible');

  try {
    const [inf, iterations] = await Promise.all([
      getInfluencer(id),
      getIterations(id),
    ]);
    renderDrawer(drawer, inf, iterations, { onClose, onRefresh });
  } catch (err) {
    drawer.innerHTML = `<div style="padding:24px;color:var(--danger)">Error: ${err.message}</div>`;
  }

  backdrop.onclick = () => closeDrawer(onClose);
}

export function closeDrawer(onClose) {
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  drawer.classList.remove('open');
  backdrop.classList.remove('visible');
  if (onClose) onClose();
}

function renderDrawer(drawer, inf, iterations, callbacks) {
  drawer.innerHTML = `
    <div class="drawer-header">
      <div class="drawer-profile">
        ${avatar(inf.name, inf.username, 'lg', inf.platform)}
        <div style="min-width:0">
          <div class="drawer-name truncate">${inf.name}</div>
          <div class="drawer-user">
            @${inf.username || '—'}
            ${inf.email ? ` · <a href="mailto:${inf.email}" style="color:var(--accent)">${inf.email}</a>` : ''}
          </div>
          <div class="drawer-badges">
            ${tierBadge(inf.tier)}
            ${zoneBadge(inf.geo_zone)}
            ${platformBadge(inf.platform)}
            ${statusBadge(inf.status)}
          </div>
        </div>
      </div>
      <button class="drawer-close" id="drawer-close-btn">✕</button>
    </div>

    <div class="tabs" id="drawer-tabs">
      <button class="tab ${_activeTab==='overview'?'active':''}" data-tab="overview">Overview</button>
      <button class="tab ${_activeTab==='iterations'?'active':''}" data-tab="iterations">
        Iterations ${iterations.length ? `<span style="margin-left:4px;background:var(--divider);border-radius:8px;padding:1px 6px;font-size:10px">${iterations.length}</span>` : ''}
      </button>
      <button class="tab ${_activeTab==='brief'?'active':''}" data-tab="brief">Brief</button>
      <button class="tab ${_activeTab==='frames'?'active':''}" data-tab="frames">Story Frames</button>
      <button class="tab ${_activeTab==='compliance'?'active':''}" data-tab="compliance">Compliance</button>
    </div>

    <div class="drawer-body" id="drawer-tab-body"></div>`;

  document.getElementById('drawer-close-btn').onclick = () => closeDrawer(callbacks.onClose);

  document.getElementById('drawer-tabs').addEventListener('click', e => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    _activeTab = btn.dataset.tab;
    drawer.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === _activeTab));
    renderTab(document.getElementById('drawer-tab-body'), inf, iterations, callbacks);
  });

  renderTab(document.getElementById('drawer-tab-body'), inf, iterations, callbacks);
}

function renderTab(body, inf, iterations, callbacks) {
  if (_activeTab === 'overview')    renderOverview(body, inf, callbacks);
  if (_activeTab === 'iterations')  renderIterations(body, inf, iterations, callbacks);
  if (_activeTab === 'brief')       renderBrief(body, inf);
  if (_activeTab === 'frames')      renderFrames(body, inf);
  if (_activeTab === 'compliance')  renderCompliance(body, inf, callbacks);
}

// ---- Overview Tab ----

function renderOverview(body, inf, callbacks) {
  const stageIdx   = STAGE_ORDER.indexOf(inf.status);
  const isArchived = inf.status === 'archived';

  body.innerHTML = `
    <div class="section">
      <div class="section-title">Import Score</div>
      ${scoreBar(inf.import_score, true)}
    </div>

    <div class="section">
      <div class="section-title">Score Breakdown</div>
      <div class="score-axes">
        ${[
          { label: 'Geo Zone', val: inf.geo_zone === 'A' ? 35 : inf.geo_zone === 'B' ? 20 : 5, max: 35 },
          { label: 'Engagement Rate', val: parseFloat(inf.engagement_rate) >= 3 ? 25 : parseFloat(inf.engagement_rate) >= 1.5 ? 15 : parseFloat(inf.engagement_rate) >= 0.5 ? 8 : 0, max: 25 },
          { label: 'Followers', val: (f => f >= 10000 && f <= 100000 ? 20 : f >= 5000 ? 15 : f >= 1000 ? 8 : f > 100000 ? 10 : 0)(inf.followers), max: 20 },
          { label: 'Content Fit', val: Math.max(0, inf.import_score - (inf.geo_zone === 'A' ? 35 : inf.geo_zone === 'B' ? 20 : 5) - (parseFloat(inf.engagement_rate) >= 3 ? 25 : parseFloat(inf.engagement_rate) >= 1.5 ? 15 : parseFloat(inf.engagement_rate) >= 0.5 ? 8 : 0) - ((f => f >= 10000 && f <= 100000 ? 20 : f >= 5000 ? 15 : f >= 1000 ? 8 : f > 100000 ? 10 : 0)(inf.followers))), max: 20 },
        ].map(ax => `
          <div class="score-axis-row">
            <span class="score-axis-label">${ax.label}</span>
            <div class="score-bar-track"><div class="score-bar-fill" style="width:${Math.round((ax.val/ax.max)*100)}%"></div></div>
            <span style="font-size:13px;font-weight:700;text-align:right">${ax.val}/${ax.max}</span>
          </div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Details</div>
      <div class="field-grid">
        <div class="field-item"><div class="field-label">Followers</div><div class="field-value">${fmtFollowers(inf.followers)}</div></div>
        <div class="field-item"><div class="field-label">Engagement Rate</div><div class="field-value">${inf.engagement_rate}%</div></div>
        <div class="field-item"><div class="field-label">Location</div><div class="field-value">${inf.location_raw || '—'}</div></div>
        <div class="field-item"><div class="field-label">Affiliate Code</div><div class="field-value">${inf.affiliate_code || '—'}</div></div>
        <div class="field-item"><div class="field-label">Avg Iteration Score</div><div class="field-value">${inf.avg_iteration_score ?? '—'}</div></div>
        <div class="field-item"><div class="field-label">Iterations</div><div class="field-value">${inf.iterations_count || 0}</div></div>
        <div class="field-item"><div class="field-label">Last Campaign</div><div class="field-value">${inf.last_campaign || '—'}</div></div>
        <div class="field-item"><div class="field-label">Content Assets</div><div class="field-value">${inf.content_library_assets || 0}</div></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Workflow Stage</div>
      <div class="workflow-stages" style="margin-bottom:16px">
        ${STAGE_ORDER.filter(s => s !== 'archived').map((s, i) => `
          <div class="stage-step ${i < stageIdx ? 'done' : i === stageIdx ? 'current' : ''}">
            <div class="stage-dot">${i < stageIdx ? '✓' : i + 1}</div>
            <div class="stage-label">${STAGE_LABELS[s]}</div>
          </div>`).join('')}
      </div>
    </div>

    ${inf.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <div class="text-sm" style="line-height:1.7;color:var(--text)">${inf.notes}</div>
      </div>` : ''}

    <div class="section">
      <div class="section-title">Stay Dates</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <div>
          <div class="form-label" style="margin-bottom:4px">Check-in</div>
          <input type="date" class="input" id="stay-start" value="${inf.stay_start || ''}" style="width:145px">
        </div>
        <div style="color:var(--muted);margin-top:18px">→</div>
        <div>
          <div class="form-label" style="margin-bottom:4px">Check-out</div>
          <input type="date" class="input" id="stay-end" value="${inf.stay_end || ''}" style="width:145px">
        </div>
        <button class="btn btn-outline btn-sm" id="btn-save-stay" style="margin-top:18px">Save</button>
        ${inf.stay_start ? `<button class="btn btn-ghost btn-sm" id="btn-clear-stay" style="margin-top:18px;color:var(--muted)">Clear</button>` : ''}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Actions</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px">
        ${!isArchived && stageIdx < STAGE_ORDER.length - 1 ? `
          <button class="btn btn-gold btn-sm" id="btn-advance">
            Move to ${STAGE_LABELS[STAGE_ORDER[stageIdx + 1]]} →
          </button>` : ''}
        <button class="btn btn-outline btn-sm" id="btn-edit-notes">Edit notes</button>
        <button class="btn btn-outline btn-sm" id="btn-edit-affiliate">Edit promo code</button>
        ${!isArchived ? `<button class="btn btn-ghost btn-sm" id="btn-archive" style="color:var(--danger)">Archive</button>` : ''}
      </div>
    </div>`;

  // Advance stage
  body.querySelector('#btn-advance')?.addEventListener('click', async () => {
    const nextStatus = STAGE_ORDER[stageIdx + 1];
    try {
      const updated = await advanceStage(inf, nextStatus);
      toast(`Moved to ${STAGE_LABELS[nextStatus]}`, 'success');
      callbacks.onRefresh?.();
      open(inf.id, callbacks);
    } catch (err) { toast(err.message, 'error'); }
  });

  // Archive
  body.querySelector('#btn-archive')?.addEventListener('click', async () => {
    if (!confirm(`Archive ${inf.name}? They will no longer appear in pipeline.`)) return;
    try {
      await archiveInfluencer(inf.id);
      toast(`${inf.name} archived`, 'info');
      closeDrawer(callbacks.onClose);
      callbacks.onRefresh?.();
    } catch (err) { toast(err.message, 'error'); }
  });

  // Stay dates
  body.querySelector('#btn-save-stay')?.addEventListener('click', async () => {
    const start = body.querySelector('#stay-start').value;
    const end   = body.querySelector('#stay-end').value;
    try {
      await updateInfluencer(inf.id, { stay_start: start || null, stay_end: end || null });
      toast('Stay dates saved', 'success');
      inf.stay_start = start; inf.stay_end = end;
      open(inf.id, callbacks);
    } catch (err) { toast(err.message, 'error'); }
  });

  body.querySelector('#btn-clear-stay')?.addEventListener('click', async () => {
    try {
      await updateInfluencer(inf.id, { stay_start: null, stay_end: null });
      toast('Stay dates cleared', 'info');
      open(inf.id, callbacks);
    } catch (err) { toast(err.message, 'error'); }
  });

  // Edit notes
  body.querySelector('#btn-edit-notes')?.addEventListener('click', () => {
    showEditFieldModal('Notes', 'notes', inf.notes || '', inf, callbacks);
  });

  // Edit affiliate code
  body.querySelector('#btn-edit-affiliate')?.addEventListener('click', () => {
    showEditFieldModal('Promo Code (e.g. EMILY15)', 'affiliate_code', inf.affiliate_code || '', inf, callbacks);
  });
}

function showEditFieldModal(label, field, currentVal, inf, callbacks) {
  openModal(`
    <div class="modal-header">
      <div class="modal-title">Edit ${label}</div>
      <button class="btn btn-ghost btn-icon modal-close-btn">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">${label}</label>
        <textarea class="input" id="edit-field-val" rows="3">${currentVal}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline modal-close-btn">Cancel</button>
      <button class="btn btn-primary" id="btn-save-field">Save</button>
    </div>`);

  document.getElementById('btn-save-field').addEventListener('click', async () => {
    const val = document.getElementById('edit-field-val').value.trim();
    try {
      await updateInfluencer(inf.id, { [field]: val });
      toast('Saved', 'success');
      closeModal();
      open(inf.id, callbacks);
    } catch (err) { toast(err.message, 'error'); }
  });
}

// ---- Iterations Tab ----

function renderIterations(body, inf, iterations, callbacks) {
  body.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        ${inf.avg_iteration_score != null
          ? `<span style="font-size:22px;font-weight:700">${inf.avg_iteration_score}</span><span class="text-muted text-sm"> avg score · ${tierBadge(inf.tier)}</span>`
          : '<span class="text-muted text-sm">No iterations scored yet</span>'}
      </div>
      <button class="btn btn-gold btn-sm" id="btn-add-iter">+ Score Iteration</button>
    </div>

    ${iterations.length ? iterations.map(iter => `
      <div class="iteration-card">
        <div class="iteration-header">
          <div>
            <div class="iteration-name">${iter.campaign_name || 'Campaign'}</div>
            <div class="iteration-date text-xs text-muted">${iter.scenario ? getScenarioLabel(iter.scenario) + ' · ' : ''}${fmtDate(iter.created_at)}</div>
          </div>
          <div style="font-size:22px;font-weight:700;color:var(--navy)">${iter.total_score}</div>
        </div>
        <div class="iteration-axes">
          ${iter.technical != null ? [
            ['Technical (35%)', iter.technical],
            ['Communication (25%)', iter.communication],
            ['Horizons Fit (40%)', iter.horizons_fit],
          ].map(([label, val]) => `
            <div class="iteration-axis">
              <span class="iteration-axis-label">${label}</span>
              <span class="iteration-axis-val">${val}/10</span>
            </div>`).join('') : [
            ['Content Quality', iter.content_quality],
            ['Value Received', iter.value_received],
            ['Longevity', iter.content_longevity],
            ['qCPE', iter.qcpe_score],
          ].map(([label, val]) => `
            <div class="iteration-axis">
              <span class="iteration-axis-label">${label}</span>
              <span class="iteration-axis-val">${val}/10</span>
            </div>`).join('')}
        </div>
        ${(() => { const r = iter.technical != null ? computeReviewTier({ technical: iter.technical, communication: iter.communication, horizons_fit: iter.horizons_fit }) : null; return r && r.border ? '<div style="margin-top:8px;font-size:11px;color:var(--gold);font-weight:600">⚠ Border case — committee review</div>' : ''; })()}
        ${iter.notes ? `<div class="text-sm text-muted" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--divider)">${iter.notes}</div>` : ''}
      </div>`).join('')
      : '<div class="text-muted text-sm" style="padding:20px 0">No iterations yet.</div>'}`;

  body.querySelector('#btn-add-iter').addEventListener('click', () => {
    showIterationModal(inf, callbacks);
  });
}

function showIterationModal(inf, callbacks) {
  let vals = { technical: 5, communication: 5, horizons_fit: 5 };

  const AXES = [
    { id: 'technical',      label: 'Technical',       weight: '35%', hint: 'Content quality, cinematography, editing, reach, production value' },
    { id: 'communication',  label: 'Communication',   weight: '25%', hint: 'Responsiveness, flexibility, professionalism, team collaboration' },
    { id: 'horizons_fit',   label: 'Horizons Fit',    weight: '40%', hint: 'How well the content hits Horizons brand narrative and emotion' },
  ];

  openModal(`
    <div class="modal-header">
      <div class="modal-title">Score Iteration — ${inf.name}</div>
      <button class="btn btn-ghost btn-icon modal-close-btn">✕</button>
    </div>
    <div class="modal-body">
      <div class="input-grid" style="margin-bottom:16px">
        <div class="form-group">
          <label class="form-label">Campaign Name</label>
          <input class="input" id="iter-campaign" placeholder="e.g. Spring 2025 Stay">
        </div>
        <div class="form-group">
          <label class="form-label">Scenario</label>
          <select class="input" id="iter-scenario">
            <option value="">— Select —</option>
            ${SCENARIOS.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="section-title" style="margin-bottom:14px">Score blocks (1–10 each)</div>

      ${AXES.map(ax => `
        <div style="margin-bottom:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div>
              <div style="display:flex;align-items:baseline;gap:6px">
                <div class="form-label" style="margin-bottom:1px">${ax.label}</div>
                <span style="font-size:11px;color:var(--text-muted);font-weight:500">${ax.weight}</span>
              </div>
              <div class="form-hint">${ax.hint}</div>
            </div>
            <div class="slider-val" id="val-${ax.id}">5</div>
          </div>
          <input type="range" min="1" max="10" step="1" value="5" id="slider-${ax.id}" data-axis="${ax.id}">
        </div>`).join('')}

      <div class="iteration-score-preview" id="iter-preview-block">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="score-preview-label">Weighted Score</span>
          <span class="score-preview-val" id="iter-score-preview">6.75</span>
        </div>
        <div id="iter-tier-preview" style="margin-top:6px;font-size:13px;font-weight:600;color:var(--gold)">Silver</div>
        <div id="iter-warning-preview" style="margin-top:4px;font-size:11px;display:none"></div>
      </div>

      <div class="form-group" style="margin-top:16px">
        <label class="form-label">Notes (optional)</label>
        <textarea class="input" id="iter-notes" rows="2" placeholder="Observations, standout content, booking data…"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline modal-close-btn">Cancel</button>
      <button class="btn btn-gold" id="btn-save-iter">Save Iteration</button>
    </div>`);

  function updatePreview() {
    const { tier, score, border, veto } = computeReviewTier(vals);
    document.getElementById('iter-score-preview').textContent = veto ? '—' : score;

    const tierEl = document.getElementById('iter-tier-preview');
    const tierColors = { Gold: 'var(--gold)', Silver: '#aaa', Bronze: '#cd7f32', 'Not Rated': 'var(--danger)' };
    tierEl.textContent = tier;
    tierEl.style.color = tierColors[tier] || 'var(--text)';

    const warnEl = document.getElementById('iter-warning-preview');
    if (veto) {
      warnEl.style.display = 'block';
      warnEl.style.color = 'var(--danger)';
      warnEl.textContent = 'Hard Veto: one or more blocks below 4 — result is Not Rated';
    } else if (border) {
      warnEl.style.display = 'block';
      warnEl.style.color = 'var(--gold)';
      warnEl.textContent = '⚠ Border case — flag for committee review';
    } else {
      warnEl.style.display = 'none';
    }
  }

  AXES.forEach(ax => {
    const slider = document.getElementById(`slider-${ax.id}`);
    const valEl  = document.getElementById(`val-${ax.id}`);
    slider.addEventListener('input', () => {
      vals[ax.id] = Number(slider.value);
      valEl.textContent = slider.value;
      updatePreview();
    });
  });

  updatePreview();

  document.getElementById('btn-save-iter').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-iter');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const result = await createIteration(inf.id, {
        campaign_name: document.getElementById('iter-campaign').value.trim(),
        scenario:      document.getElementById('iter-scenario').value,
        technical:     vals.technical,
        communication: vals.communication,
        horizons_fit:  vals.horizons_fit,
        notes:         document.getElementById('iter-notes').value.trim(),
      });
      toast(`Iteration saved · Score: ${result.iteration.total_score} · Tier: ${result.influencer.tier}`, 'success');
      closeModal();
      callbacks.onRefresh?.();
      open(inf.id, callbacks);
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Save Iteration';
    }
  });
}

// ---- Brief Tab ----

const NETWORK_FORMATS = {
  instagram: {
    label: 'Instagram', color: '#E1306C', tag: '@gohorizons',
    formats: [
      { id: 'reels',    label: 'Reels' },
      { id: 'stories',  label: 'Stories' },
      { id: 'posts',    label: 'Feed Posts' },
      { id: 'raw',      label: 'Raw Materials' },
    ],
  },
  tiktok: {
    label: 'TikTok', color: '#010101', tag: '@horizonsgetaways',
    formats: [
      { id: 'videos',   label: 'Videos' },
      { id: 'raw',      label: 'Raw Materials' },
    ],
  },
  youtube: {
    label: 'YouTube', color: '#FF0000', tag: '@horizonsgetaways',
    formats: [
      { id: 'shorts',   label: 'Shorts' },
      { id: 'videos',   label: 'Long-form Videos' },
      { id: 'raw',      label: 'Raw Materials' },
    ],
  },
  facebook: {
    label: 'Facebook', color: '#1877F2', tag: 'Horizons Sandhills',
    formats: [
      { id: 'posts',    label: 'Posts' },
      { id: 'stories',  label: 'Stories' },
      { id: 'raw',      label: 'Raw Materials' },
    ],
  },
};

function renderBrief(body, inf) {
  const pkg       = (inf.content_package && typeof inf.content_package === 'object') ? inf.content_package : {};
  const networks  = Array.isArray(pkg.networks) ? pkg.networks : [];
  const direction = inf.content_direction || '';

  body.innerHTML = `
    <div class="section">
      <div class="section-title" style="margin-bottom:10px">Important Note</div>
      <div style="background:#FFFBEB;border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:12px 14px;font-size:13px;line-height:1.65;color:var(--text)">
        Please ensure the content includes <strong>people</strong> to highlight joyful experiences and vibrant moments. Film activities — sports, relaxing, exploring nature, biking, table tennis. Capture wildlife, scenic paths, and peaceful surroundings.
      </div>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:12px">Content Package</div>

      <div class="brief-networks-row">
        ${Object.entries(NETWORK_FORMATS).map(([id, net]) => `
          <label class="brief-net-chip ${networks.includes(id) ? 'active' : ''}" style="--net-color:${net.color}">
            <input type="checkbox" class="brief-net-cb" data-net="${id}" ${networks.includes(id) ? 'checked' : ''}>
            ${net.label}
          </label>`).join('')}
      </div>

      <div id="brief-formats-wrap" style="margin-top:16px;display:flex;flex-direction:column;gap:12px">
        ${Object.entries(NETWORK_FORMATS).map(([id, net]) => `
          <div class="brief-net-block ${networks.includes(id) ? '' : 'hidden'}" data-net="${id}">
            <div style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${net.color};margin-bottom:8px">${net.label}</div>
            <div class="brief-formats-grid">
              ${net.formats.map(f => `
                <div class="brief-format-row">
                  <span class="brief-format-label">${f.label}</span>
                  <input type="number" min="0" max="99" class="input brief-qty-input"
                         data-net="${id}" data-fmt="${f.id}"
                         value="${(pkg[id] && pkg[id][f.id]) || 0}"
                         style="width:64px;text-align:center;padding:4px 8px">
                  <span style="font-size:12px;color:var(--muted)">pcs</span>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:8px">Direction / Main Topic</div>
      <div style="font-size:12px;color:var(--muted);margin-bottom:8px">Set the main topic for the campaign. Content planners fill this in per stay.</div>
      <textarea class="input" id="brief-direction" rows="3" placeholder="e.g. Relaxation & wellness getaway · Couples retreat · Birthday celebration…">${direction}</textarea>
      <button class="btn btn-primary btn-sm" id="btn-save-direction" style="margin-top:8px">Save Direction</button>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:10px">Timeline</div>
      <div style="font-size:13px;line-height:1.7;color:var(--text)">
        Provide and post all materials <strong>within 3 days after departure</strong> via Google Drive or Dropbox — mark Horizons as <strong>Editor</strong>.
      </div>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:10px">Social Tags</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div style="font-size:13px"><span style="color:var(--muted);width:80px;display:inline-block">Instagram</span> <strong>@gohorizons</strong> <button class="btn btn-ghost btn-xs copy-tag" data-val="@gohorizons" style="margin-left:6px;font-size:11px;padding:2px 8px">Copy</button></div>
        <div style="font-size:13px"><span style="color:var(--muted);width:80px;display:inline-block">TikTok</span> <strong>@horizonsgetaways</strong> <button class="btn btn-ghost btn-xs copy-tag" data-val="@horizonsgetaways" style="margin-left:6px;font-size:11px;padding:2px 8px">Copy</button></div>
        <div style="font-size:13px"><span style="color:var(--muted);width:80px;display:inline-block">Facebook</span> <button class="btn btn-ghost btn-xs copy-tag" data-val="https://www.facebook.com/share/12A7DjbQPAy/?mibextid=wwXIfr" style="font-size:11px;padding:2px 8px">Copy link</button></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title" style="margin-bottom:10px">Review Platforms</div>
      <div style="font-size:13px;color:var(--text);line-height:1.8">
        Ask guests to leave a review on: <strong>Facebook · Google · Tripadvisor · Yelp</strong>
      </div>
      <a href="https://www.google.com/maps/place/Horizons+Sandhills/@34.6049918,-80.1000901,17z" target="_blank" style="font-size:12px;color:var(--accent);margin-top:4px;display:inline-block">Google Maps link →</a>
    </div>`;

  async function savePackage() {
    const newNetworks = [...body.querySelectorAll('.brief-net-cb:checked')].map(c => c.dataset.net);
    const newPkg = { networks: newNetworks };
    body.querySelectorAll('.brief-qty-input').forEach(inp => {
      const { net, fmt } = inp.dataset;
      if (!newPkg[net]) newPkg[net] = {};
      newPkg[net][fmt] = parseInt(inp.value) || 0;
    });
    try {
      await updateInfluencer(inf.id, { content_package: newPkg });
      inf.content_package = newPkg;
    } catch (err) { toast(err.message, 'error'); }
  }

  // Network checkboxes — show/hide blocks
  body.querySelectorAll('.brief-net-cb').forEach(cb => {
    cb.addEventListener('change', () => {
      const block = body.querySelector(`.brief-net-block[data-net="${cb.dataset.net}"]`);
      const chip  = cb.closest('.brief-net-chip');
      block?.classList.toggle('hidden', !cb.checked);
      chip?.classList.toggle('active', cb.checked);
      savePackage();
    });
  });

  // Qty inputs — save on change
  body.querySelectorAll('.brief-qty-input').forEach(inp => {
    inp.addEventListener('change', savePackage);
  });

  // Save direction
  body.querySelector('#btn-save-direction').addEventListener('click', async () => {
    const val = body.querySelector('#brief-direction').value.trim();
    try {
      await updateInfluencer(inf.id, { content_direction: val });
      inf.content_direction = val;
      toast('Direction saved', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  // Copy tags
  body.querySelectorAll('.copy-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard?.writeText(btn.dataset.val);
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = orig; }, 1500);
    });
  });
}

// ---- Story Frames Tab ----

function renderFrames(body, inf) {
  const defaultScenario    = inf.current_scenario || 'couples';
  const defaultPersonality = 'adventurous';

  body.innerHTML = `
    <div class="section-title" style="margin-bottom:4px">Story Frame Generator</div>
    <div class="text-muted text-sm" style="margin-bottom:16px;line-height:1.6">
      Select scenario and personality type. Frames are inspirations — not scripts. Send as prompts, not briefs.
    </div>
    <div class="frame-controls">
      <div>
        <div class="form-label">Scenario</div>
        <select class="frame-select" id="frame-scenario">
          ${SCENARIOS.map(s => `<option value="${s.id}" ${s.id === defaultScenario ? 'selected' : ''}>${s.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="form-label">Creator Personality</div>
        <select class="frame-select" id="frame-personality">
          ${PERSONALITIES.map(p => `<option value="${p.id}" ${p.id === defaultPersonality ? 'selected' : ''}>${p.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="frames-output"></div>`;

  function renderFrameCards() {
    const scenario    = document.getElementById('frame-scenario').value;
    const personality = document.getElementById('frame-personality').value;
    const frames      = getFrames(scenario, personality);

    document.getElementById('frames-output').innerHTML = frames.length
      ? frames.map((f, i) => `
          <div class="frame-card">
            <div class="frame-num">Frame ${i + 1}</div>
            <div class="frame-text">${f}</div>
            <button class="frame-copy" data-text="${encodeURIComponent(f)}">Copy</button>
          </div>`).join('')
      : '<div class="text-muted text-sm">No frames for this combination.</div>';

    document.querySelectorAll('.frame-copy').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard?.writeText(decodeURIComponent(btn.dataset.text));
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 2000);
      });
    });
  }

  body.querySelector('#frame-scenario').addEventListener('change', renderFrameCards);
  body.querySelector('#frame-personality').addEventListener('change', renderFrameCards);
  renderFrameCards();

  // Save scenario to influencer record in background
  body.querySelector('#frame-scenario').addEventListener('change', e => {
    updateInfluencer(inf.id, { current_scenario: e.target.value }).catch(() => {});
  });
}

// ---- Compliance Tab ----

function renderCompliance(body, inf, callbacks) {
  const ftcConfirmed = !!inf.ftc_disclosure_confirmed;

  body.innerHTML = `
    <div class="${ftcConfirmed ? 'ftc-banner ftc-confirmed' : 'ftc-banner'}">
      <div style="font-size:18px">${ftcConfirmed ? '✅' : '⚠️'}</div>
      <div>
        <div style="font-weight:600;margin-bottom:3px">
          FTC Disclosure: ${ftcConfirmed ? 'Confirmed' : 'Not yet confirmed'}
        </div>
        <div style="font-size:12px;line-height:1.5">
          All sponsored content and gifted stays must be disclosed. Federal FTC requirement.
          Accepted formats: #ad · #sponsored · #gifted · #partner · Paid partnership label on Instagram.
        </div>
      </div>
    </div>

    <div class="toggle-wrap">
      <label class="toggle">
        <input type="checkbox" id="ftc-toggle" ${ftcConfirmed ? 'checked' : ''}>
        <span class="toggle-track"></span>
      </label>
      <span style="font-size:14px;font-weight:500">Disclosure confirmed on all content</span>
    </div>

    <div class="divider"></div>

    <div class="section-title" style="margin-bottom:12px">Required for each piece of content</div>
    <div class="checklist">
      ${[
        '#ad, #sponsored, #gifted, or #partner visible in caption',
        'Or "Paid partnership with Horizons" label used on Instagram',
        'Disclosure appears before the "more" fold (not buried)',
        'No ambiguous phrases — must be clearly identifiable as sponsored',
        'Stories: disclosure on every individual story frame',
      ].map(item => `
        <div class="check-row">
          <div class="check-icon ${ftcConfirmed ? 'done' : 'pending'}"></div>
          <span style="font-size:13px">${item}</span>
        </div>`).join('')}
    </div>

    <div class="divider"></div>

    <div class="section-title" style="margin-bottom:8px">SC / Federal compliance note</div>
    <div class="text-sm text-muted" style="line-height:1.7">
      South Carolina follows standard federal FTC rules. No additional state-level requirements beyond federal standards.
      California AB 1880 / SB 764 (minor income protection) does not apply to Patrick, SC operations.
    </div>`;

  document.getElementById('ftc-toggle').addEventListener('change', async e => {
    try {
      await updateInfluencer(inf.id, { ftc_disclosure_confirmed: e.target.checked });
      toast(`FTC disclosure ${e.target.checked ? 'confirmed' : 'unconfirmed'}`, e.target.checked ? 'success' : 'info');
      callbacks.onRefresh?.();
      // Re-render compliance tab
      inf.ftc_disclosure_confirmed = e.target.checked;
      renderCompliance(body, inf, callbacks);
    } catch (err) {
      toast(err.message, 'error');
      e.target.checked = !e.target.checked;
    }
  });
}

// ---- Helpers ----

function fmtFollowers(n) {
  if (!n) return '—';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
