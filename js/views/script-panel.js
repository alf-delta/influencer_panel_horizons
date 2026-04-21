// ============================================================
// Horizons Influencer Panel — Script Panel
// Opens to the left of the influencer drawer.
// Scripts are static per stage; notes saved to localStorage
// keyed by manager email + influencer id + stage.
// ============================================================

import { STAGE_SCRIPTS } from '../scripts-data.js';
import { getSession }    from '../auth.js';

const PANEL_ID = 'script-panel';

// ---- localStorage helpers ----

async function noteKey(influencerId, stage) {
  const session = await getSession();
  const user    = session?.user?.email || 'anon';
  return `hz_note_${user}_${influencerId}_${stage}`;
}

async function loadNote(influencerId, stage) {
  return localStorage.getItem(await noteKey(influencerId, stage)) || '';
}

async function saveNote(influencerId, stage, text) {
  localStorage.setItem(await noteKey(influencerId, stage), text);
}

// ---- Public API ----

export async function openScriptPanel(inf) {
  let panel = document.getElementById(PANEL_ID);
  if (!panel) {
    panel = document.createElement('aside');
    panel.id    = PANEL_ID;
    panel.className = 'script-panel';
    document.body.appendChild(panel);
  }

  const script = STAGE_SCRIPTS[inf.status] || STAGE_SCRIPTS['candidate'];
  const note   = await loadNote(inf.id, inf.status);

  panel.innerHTML = buildHTML(script, inf, note);

  // Staggered slide-in after drawer
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('open')));

  // Close button
  panel.querySelector('#sp-close-btn')?.addEventListener('click', closeScriptPanel);

  // Objection accordion
  panel.querySelectorAll('.sp-obj-item').forEach(item => {
    item.addEventListener('click', () => {
      const ans = item.querySelector('.sp-obj-a');
      const isOpen = item.classList.contains('expanded');
      // collapse all
      panel.querySelectorAll('.sp-obj-item').forEach(i => {
        i.classList.remove('expanded');
        i.querySelector('.sp-obj-a')?.classList.add('hidden');
      });
      if (!isOpen) {
        item.classList.add('expanded');
        ans?.classList.remove('hidden');
      }
    });
  });

  // Copy buttons
  panel.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      navigator.clipboard?.writeText(btn.dataset.copy);
      const orig = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
    });
  });

  // Auto-save notes
  panel.querySelector('#sp-note')?.addEventListener('input', async e => {
    await saveNote(inf.id, inf.status, e.target.value);
  });
}

export function closeScriptPanel() {
  const panel = document.getElementById(PANEL_ID);
  if (panel) panel.classList.remove('open');
}

// ---- Render ----

function hl(text) {
  // Highlight [placeholders] in replica text
  return text.replace(/\[([^\]]+)\]/g, '<span class="sp-placeholder">[$1]</span>');
}

function esc(str) {
  return str.replace(/"/g, '&quot;');
}

function buildHTML(script, inf, note) {
  return `
    <div class="sp-header">
      <div class="sp-header-info">
        <div class="sp-stage-badge" style="color:${script.color};border-color:${script.color}">
          ${script.label}
        </div>
        <div class="sp-inf-name">${inf.name}</div>
      </div>
      <button class="sp-close" id="sp-close-btn" title="Close script">✕</button>
    </div>

    <div class="sp-body">

      <div class="sp-block">
        <div class="sp-block-title">${script.opener.title}</div>
        <div class="sp-replica">${hl(script.opener.text)}</div>
        <button class="sp-copy-btn" data-copy="${esc(script.opener.text)}">Copy</button>
      </div>

      <div class="sp-block">
        <div class="sp-block-title">Objection Handling
          <span class="sp-block-hint">tap to expand</span>
        </div>
        <div class="sp-obj-list">
          ${script.objections.map(obj => `
            <div class="sp-obj-item">
              <div class="sp-obj-q">
                <span class="sp-obj-icon">›</span>
                ${obj.q}
              </div>
              <div class="sp-obj-a hidden">
                ${hl(obj.a)}
                <button class="sp-copy-btn" data-copy="${esc(obj.a)}" style="margin-top:8px">Copy</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="sp-block">
        <div class="sp-block-title">${script.closing.title}</div>
        <div class="sp-replica">${hl(script.closing.text)}</div>
        <button class="sp-copy-btn" data-copy="${esc(script.closing.text)}">Copy</button>
      </div>

      <div class="sp-block sp-notes-block">
        <div class="sp-block-title">Manager Notes</div>
        <textarea class="sp-notes-input" id="sp-note"
          placeholder="Notes for this call — key objections raised, tone, follow-up…"
        >${note}</textarea>
      </div>

    </div>`;
}
