// ============================================================
// Horizons Influencer Panel — Pipeline (Kanban) View
// ============================================================

import { getInfluencers, advanceStage } from '../db.js';
import { STAGE_ORDER, STAGE_LABELS } from '../scoring.js';
import { avatar, tierBadge, zoneBadge, scoreBar, toast } from '../ui.js';

const ACTIVE_STAGES = ['candidate','outreach','active','in_production','review','complete'];

export async function render(container, { openInfluencer }) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Pipeline</div>
        <div class="page-subtitle">Move influencers through the 6-stage workflow</div>
      </div>
    </div>
    <div class="pipeline-body">
      <div id="kanban-wrap"><div class="loading-overlay"><div class="spinner"></div> Loading…</div></div>
    </div>`;

  await loadKanban(container, openInfluencer);
}

async function loadKanban(container, openInfluencer) {
  try {
    const influencers = await getInfluencers();
    const wrap = container.querySelector('#kanban-wrap');
    wrap.innerHTML = renderKanban(influencers);
    bindEvents(wrap, influencers, openInfluencer, container);
  } catch (err) {
    container.querySelector('#kanban-wrap').innerHTML =
      `<div class="loading-overlay" style="color:var(--danger)">⚠ ${err.message}</div>`;
  }
}

function renderKanban(influencers) {
  const byStatus = {};
  ACTIVE_STAGES.forEach(s => { byStatus[s] = []; });
  influencers
    .filter(i => i.status !== 'archived')
    .forEach(i => { if (byStatus[i.status]) byStatus[i.status].push(i); });

  return `<div class="kanban">
    ${ACTIVE_STAGES.map((status, idx) => `
      <div class="kanban-col" data-status="${status}">
        <div class="kanban-col-header">
          <span class="kanban-col-label">${STAGE_LABELS[status]}</span>
          <span class="kanban-col-count">${byStatus[status].length}</span>
        </div>
        <div class="kanban-cards">
          ${byStatus[status].length
            ? byStatus[status].map(inf => renderCard(inf, idx, ACTIVE_STAGES.length)).join('')
            : '<div class="kanban-empty">Drop zone</div>'}
        </div>
      </div>`).join('')}
  </div>`;
}

function renderCard(inf, colIdx, total) {
  const canBack    = colIdx > 0;
  const canForward = colIdx < total - 1;
  const prevStatus = canBack    ? ACTIVE_STAGES[colIdx - 1] : null;
  const nextStatus = canForward ? ACTIVE_STAGES[colIdx + 1] : null;

  return `
    <div class="kanban-card" data-id="${inf.id}">
      <div class="kanban-card-top">
        <div>
          <div class="kanban-card-name">${inf.name}</div>
          <div class="kanban-card-user">@${inf.username || '—'}</div>
        </div>
        ${avatar(inf.name, inf.username, 'sm')}
      </div>
      <div class="kanban-card-meta">
        ${tierBadge(inf.tier)}
        ${zoneBadge(inf.geo_zone)}
        ${inf.ftc_disclosure_confirmed ? '<span class="badge" style="background:#DCFCE7;color:#166534">FTC ✓</span>' : ''}
      </div>
      <div class="kanban-card-score">
        ${scoreBar(inf.import_score)}
      </div>
      <div class="kanban-move-btns">
        ${canBack ? `<button class="move-btn" data-move="${inf.id}" data-target="${prevStatus}" title="Move to ${STAGE_LABELS[prevStatus]}">← ${STAGE_LABELS[prevStatus].split(' ')[0]}</button>` : '<span></span>'}
        ${canForward ? `<button class="move-btn" data-move="${inf.id}" data-target="${nextStatus}" title="Move to ${STAGE_LABELS[nextStatus]}">${STAGE_LABELS[nextStatus].split(' ')[0]} →</button>` : '<span></span>'}
      </div>
    </div>`;
}

function bindEvents(wrap, influencers, openInfluencer, container) {
  // Open detail on card click (but not on move buttons)
  wrap.addEventListener('click', async e => {
    // Move button
    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      e.stopPropagation();
      const id     = moveBtn.dataset.move;
      const target = moveBtn.dataset.target;
      const inf    = influencers.find(i => i.id === id);
      if (!inf) return;
      moveBtn.disabled = true;
      try {
        await advanceStage(inf, target);
        toast(`Moved ${inf.name} → ${STAGE_LABELS[target]}`, 'success');
        await loadKanban(container, openInfluencer);
      } catch (err) {
        toast(err.message, 'error');
        moveBtn.disabled = false;
      }
      return;
    }

    // Card click
    const card = e.target.closest('.kanban-card[data-id]');
    if (card) openInfluencer(card.dataset.id);
  });
}
