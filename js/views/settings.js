// ============================================================
// Horizons Influencer Panel — Settings View
// ============================================================

import { getConfig, saveConfig } from '../config.js';
import { initDB } from '../db.js';
import { toast } from '../ui.js';

export function render(container, { onConfigSave }) {
  const cfg = getConfig();

  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Settings</div>
        <div class="page-subtitle">Configure Supabase connection and Attio webhook</div>
      </div>
    </div>
    <div class="settings-body">

      <div class="settings-section">
        <div class="settings-section-title">Supabase</div>
        <div class="settings-section-desc">
          Connect your Supabase project. Run <code>supabase_schema.sql</code> first in the Supabase SQL Editor to create the required tables.
        </div>
        <div class="settings-card">
          <div class="form-group">
            <label class="form-label">Project URL</label>
            <input class="input" id="cfg-url" type="url" placeholder="https://xxxx.supabase.co" value="${cfg.supabaseUrl || ''}">
            <div class="form-hint">Found in Supabase → Project Settings → API → Project URL</div>
          </div>
          <div class="form-group">
            <label class="form-label">Anon Public Key</label>
            <input class="input" id="cfg-key" type="password" placeholder="eyJ…" value="${cfg.supabaseKey || ''}">
            <div class="form-hint">Found in Supabase → Project Settings → API → Project API Keys → anon public</div>
          </div>
          <div class="conn-status-row">
            <div class="conn-status-dot" id="conn-dot"></div>
            <span id="conn-status-text">Not tested</span>
          </div>
          <div style="display:flex;gap:10px;margin-top:12px">
            <button class="btn btn-primary btn-sm" id="btn-save-db">Save & Test Connection</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Attio Webhook (Zapier)</div>
        <div class="settings-section-desc">
          Paste your Zapier "Catch Hook" URL here. The panel fires events on: influencer import, stage change, and iteration save.
          Each event includes the full influencer payload ready for Attio field mapping.
        </div>
        <div class="settings-card">
          <div class="form-group">
            <label class="form-label">Zapier Webhook URL</label>
            <input class="input" id="cfg-webhook" type="url" placeholder="https://hooks.zapier.com/hooks/catch/…" value="${cfg.attioWebhook || ''}">
            <div class="form-hint">Zapier → Create Zap → Trigger: Webhooks by Zapier → Catch Hook → Copy URL</div>
          </div>
          <div style="display:flex;gap:10px;margin-top:4px">
            <button class="btn btn-outline btn-sm" id="btn-save-webhook">Save Webhook</button>
            <button class="btn btn-ghost btn-sm" id="btn-test-webhook">Send test event</button>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Event Payloads</div>
        <div class="settings-section-desc">What each event sends to your Zapier webhook:</div>
        <div class="settings-card">
          ${[
            { event: 'import', desc: 'Fires on CSV import or manual add. Sends: name, username, email, platform, followers, ER, location, geo_zone, import_score, status, panel_id.' },
            { event: 'stage_change', desc: 'Fires when a stage is advanced. Sends: panel_id, name, email, status, tier, FTC flag, affiliate_code, current_scenario.' },
            { event: 'iteration_saved', desc: 'Fires after scoring an iteration. Sends: avg_iteration_score, iterations_count, tier, qcpe_last_iteration, last_campaign + full iteration object.' },
          ].map(e => `
            <div style="padding:12px 0;border-bottom:1px solid var(--divider)">
              <div style="font-size:12px;font-weight:700;font-family:monospace;color:var(--gold);margin-bottom:4px">${e.event}</div>
              <div class="text-sm text-muted" style="line-height:1.6">${e.desc}</div>
            </div>`).join('')}
        </div>
      </div>

    </div>`;

  document.getElementById('btn-save-db').addEventListener('click', async () => {
    const url = document.getElementById('cfg-url').value.trim();
    const key = document.getElementById('cfg-key').value.trim();

    if (!url || !key) { toast('Both URL and key are required', 'error'); return; }

    const btn = document.getElementById('btn-save-db');
    btn.disabled = true;
    btn.textContent = 'Testing…';
    setConnStatus('connecting');

    saveConfig({ supabaseUrl: url, supabaseKey: key });

    const ok = await initDB();
    if (ok) {
      setConnStatus('ok');
      toast('Supabase connected ✓', 'success');
      onConfigSave?.();
    } else {
      setConnStatus('err');
      toast('Connection failed — check URL and key', 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Save & Test Connection';
  });

  document.getElementById('btn-save-webhook').addEventListener('click', () => {
    const url = document.getElementById('cfg-webhook').value.trim();
    saveConfig({ attioWebhook: url });
    toast(url ? 'Webhook URL saved' : 'Webhook URL cleared', 'success');
  });

  document.getElementById('btn-test-webhook').addEventListener('click', async () => {
    const url = document.getElementById('cfg-webhook').value.trim();
    if (!url) { toast('Enter webhook URL first', 'error'); return; }

    const btn = document.getElementById('btn-test-webhook');
    btn.disabled = true;
    btn.textContent = 'Sending…';

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'test',
          source: 'horizons_panel_v2',
          timestamp: new Date().toISOString(),
          message: 'Test event from Horizons Influencer Panel',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast('Test event sent — check your Zap', 'success');
    } catch (err) {
      toast(`Webhook error: ${err.message}`, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'Send test event';
  });
}

function setConnStatus(state) {
  const dot  = document.getElementById('conn-dot');
  const text = document.getElementById('conn-status-text');
  if (!dot) return;

  const map = {
    ok:         { cls: 'ok',  label: 'Connected ✓' },
    err:        { cls: 'err', label: 'Connection failed' },
    connecting: { cls: '',    label: 'Testing…' },
  };

  const { cls, label } = map[state] || { cls: '', label: 'Not tested' };
  dot.className   = `conn-status-dot ${cls}`;
  text.textContent = label;
}
