// ============================================================
// Horizons Influencer Panel — Influencer Detail Drawer
// Tabs: Overview | Iterations | Story Frames | Compliance
// ============================================================

import { getInfluencer, getIterations, createIteration, updateInfluencer, advanceStage, archiveInfluencer } from '../db.js';
import { computeIterationScore, STAGE_ORDER, STAGE_LABELS, STAGE_CHECKLISTS } from '../scoring.js';
import { SCENARIOS, PERSONALITIES, getFrames, getScenarioLabel, getPersonalityLabel } from '../frames.js';
import { avatar, avatarInitials, tierBadge, zoneBadge, platformBadge, statusBadge, scoreBar, toast, openModal, closeModal } from '../ui.js';

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
        ${avatar(inf.name, inf.username, 'lg')}
        <div style="min-width:0">
          <div class="drawer-name truncate">${inf.name}</div>
          <div class="drawer-user">@${inf.username || '—'} · ${inf.email || '—'}</div>
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
      ${!isArchived ? `
        <div class="section-title" style="margin-top:16px">Current stage checklist</div>
        <div class="checklist">
          ${(STAGE_CHECKLISTS[inf.status] || []).map(item => `
            <div class="check-row">
              <div class="check-icon pending"></div>
              <span>${item}</span>
            </div>`).join('')}
        </div>` : ''}
    </div>

    ${inf.notes ? `
      <div class="section">
        <div class="section-title">Notes</div>
        <div class="text-sm" style="line-height:1.7;color:var(--text)">${inf.notes}</div>
      </div>` : ''}

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
          ${[
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
        ${iter.notes ? `<div class="text-sm text-muted" style="margin-top:10px;padding-top:10px;border-top:1px solid var(--divider)">${iter.notes}</div>` : ''}
      </div>`).join('')
      : '<div class="text-muted text-sm" style="padding:20px 0">No iterations yet.</div>'}`;

  body.querySelector('#btn-add-iter').addEventListener('click', () => {
    showIterationModal(inf, callbacks);
  });
}

function showIterationModal(inf, callbacks) {
  let vals = { content_quality: 5, value_received: 5, content_longevity: 5, qcpe_score: 5 };

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

      <div class="section-title" style="margin-bottom:14px">Score Axes (0–10 each)</div>

      ${[
        { id: 'content_quality',   label: 'Content Quality',  hint: 'Visual quality, narrative depth, originality, emotional resonance' },
        { id: 'value_received',    label: 'Value Received',   hint: 'Reach, saves, shares, traffic, booking inquiries' },
        { id: 'content_longevity', label: 'Content Longevity',hint: 'Is the content reusable? Does it hold value over time?' },
        { id: 'qcpe_score',        label: 'qCPE Score',       hint: 'Saves, meaningful comments, link clicks, DM inquiries' },
      ].map(ax => `
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
            <div>
              <div class="form-label" style="margin-bottom:1px">${ax.label}</div>
              <div class="form-hint">${ax.hint}</div>
            </div>
            <div class="slider-val" id="val-${ax.id}">5</div>
          </div>
          <input type="range" min="0" max="10" step="1" value="5" id="slider-${ax.id}" data-axis="${ax.id}">
        </div>`).join('')}

      <div class="iteration-score-preview">
        <span class="score-preview-label">Iteration Score</span>
        <span class="score-preview-val" id="iter-score-preview">50.0</span>
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

  // Live slider updates
  ['content_quality','value_received','content_longevity','qcpe_score'].forEach(ax => {
    const slider = document.getElementById(`slider-${ax}`);
    const valEl  = document.getElementById(`val-${ax}`);
    slider.addEventListener('input', () => {
      vals[ax] = Number(slider.value);
      valEl.textContent = slider.value;
      updatePreview();
    });
  });

  function updatePreview() {
    const score = computeIterationScore(vals);
    document.getElementById('iter-score-preview').textContent = score;
  }

  document.getElementById('btn-save-iter').addEventListener('click', async () => {
    const btn = document.getElementById('btn-save-iter');
    btn.disabled = true;
    btn.textContent = 'Saving…';
    try {
      const result = await createIteration(inf.id, {
        campaign_name:    document.getElementById('iter-campaign').value.trim(),
        scenario:         document.getElementById('iter-scenario').value,
        content_quality:  vals.content_quality,
        value_received:   vals.value_received,
        content_longevity:vals.content_longevity,
        qcpe_score:       vals.qcpe_score,
        notes:            document.getElementById('iter-notes').value.trim(),
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
