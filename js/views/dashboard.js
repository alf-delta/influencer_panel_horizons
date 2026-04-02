// ============================================================
// Horizons Influencer Panel — Dashboard View
// ============================================================

import { getDashboardStats, getTopPerformers, getRecentImports } from '../db.js';
import { STAGE_LABELS } from '../scoring.js';
import { avatar, avatarInitials, tierBadge, zoneBadge, platformBadge, fmtDate } from '../ui.js';

export async function render(container, { navigate }) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Dashboard</div>
        <div class="page-subtitle">Horizons Influencer Program overview</div>
      </div>
    </div>
    <div class="dashboard-body">
      <div id="dash-content"><div class="loading-overlay"><div class="spinner"></div> Loading…</div></div>
    </div>`;

  try {
    const [stats, top, recent] = await Promise.all([
      getDashboardStats(),
      getTopPerformers(5),
      getRecentImports(8),
    ]);
    document.getElementById('dash-content').innerHTML = renderContent(stats, top, recent);
    bindEvents(container, navigate);
  } catch (err) {
    document.getElementById('dash-content').innerHTML = `
      <div class="loading-overlay" style="color:var(--danger)">⚠ ${err.message}</div>`;
  }
}

function renderContent(stats, top, recent) {
  const stageOrder = ['candidate','outreach','active','in_production','review','complete'];
  const maxPipeline = Math.max(...stageOrder.map(s => stats.pipeline[s] || 0), 1);

  return `
    <div class="stat-grid">
      <div class="stat-card navy">
        <div class="stat-label">Total Influencers</div>
        <div class="stat-value">${stats.total}</div>
        <div class="stat-sub">all time in panel</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-label">Gold Tier</div>
        <div class="stat-value">${stats.gold}</div>
        <div class="stat-sub">ambassador candidates</div>
      </div>
      <div class="stat-card silver">
        <div class="stat-label">Silver Tier</div>
        <div class="stat-value">${stats.silver}</div>
        <div class="stat-sub">active collaborators</div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">Unrated</div>
        <div class="stat-value">${stats.unrated}</div>
        <div class="stat-sub">awaiting campaign</div>
      </div>
    </div>

    <div class="dash-grid">
      <div class="card">
        <div class="dash-section-title">Pipeline Funnel</div>
        ${stageOrder.map(s => `
          <div class="funnel-row">
            <div class="funnel-label">${STAGE_LABELS[s]}</div>
            <div class="funnel-bar-wrap">
              <div class="funnel-bar" style="width:${Math.round(((stats.pipeline[s] || 0) / maxPipeline) * 100)}%"></div>
            </div>
            <div class="funnel-count">${stats.pipeline[s] || 0}</div>
          </div>`).join('')}
      </div>

      <div class="card">
        <div class="dash-section-title">Top Performers</div>
        ${top.length ? top.map(inf => `
          <div class="top-item" data-id="${inf.id}" style="cursor:pointer">
            ${avatar(inf.name, inf.username, 'sm', inf.platform)}
            <div style="flex:1;min-width:0">
              <div class="font-medium truncate" style="font-size:13px">${inf.name}</div>
              <div class="text-muted text-xs">@${inf.username || '—'} · ${zoneBadge(inf.geo_zone)}</div>
            </div>
            ${tierBadge(inf.tier)}
            <div class="score-val">${inf.avg_iteration_score ?? '—'}</div>
          </div>`).join('') : '<div class="text-muted text-sm" style="padding:8px 0">No scored influencers yet.</div>'}
      </div>

      <div class="card" style="grid-column:1/-1">
        <div class="dash-section-title">Recent Imports</div>
        ${recent.length ? `
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)">Influencer</th>
                <th style="text-align:left;padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)">Platform</th>
                <th style="text-align:left;padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)">Zone</th>
                <th style="text-align:right;padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)">Score</th>
                <th style="text-align:left;padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)">Tier</th>
                <th style="text-align:left;padding:6px 10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);border-bottom:1px solid var(--card-border)">Imported</th>
              </tr>
            </thead>
            <tbody>
              ${recent.map(inf => `
                <tr data-id="${inf.id}" style="cursor:pointer">
                  <td style="padding:9px 10px;border-bottom:1px solid var(--divider)">
                    <div style="display:flex;align-items:center;gap:9px">
                      ${avatar(inf.name, inf.username, 'sm', inf.platform)}
                      <div>
                        <div style="font-weight:500">${inf.name}</div>
                        <div class="text-muted text-xs">@${inf.username || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td style="padding:9px 10px;border-bottom:1px solid var(--divider)">${platformBadge(inf.platform)}</td>
                  <td style="padding:9px 10px;border-bottom:1px solid var(--divider)">${zoneBadge(inf.geo_zone)}</td>
                  <td style="padding:9px 10px;border-bottom:1px solid var(--divider);text-align:right;font-weight:700">${inf.import_score}</td>
                  <td style="padding:9px 10px;border-bottom:1px solid var(--divider)">${tierBadge(inf.tier)}</td>
                  <td style="padding:9px 10px;border-bottom:1px solid var(--divider);color:var(--muted)">${fmtDate(inf.created_at)}</td>
                </tr>`).join('')}
            </tbody>
          </table>` : '<div class="text-muted text-sm" style="padding:8px 0">No imports yet. Go to Candidates to import a CSV.</div>'}
      </div>
    </div>`;
}

function bindEvents(container, navigate) {
  container.querySelectorAll('[data-id]').forEach(el => {
    el.addEventListener('click', () => navigate('candidates', { openId: el.dataset.id }));
  });
}
