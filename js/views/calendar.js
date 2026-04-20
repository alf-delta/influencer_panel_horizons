// ============================================================
// Horizons Influencer Panel — Calendar View
// ============================================================

import { getInfluencers } from '../db.js';
import { toast } from '../ui.js';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

const COLORS = [
  '#4A7FCB','#D4873A','#3DAA72','#9B59B6',
  '#E05C5C','#16A69E','#C49B2E','#5C8EC4',
  '#E07B3A','#2EAA8A','#7B5EA7','#C45C5C',
];

let _year  = new Date().getFullYear();
let _month = new Date().getMonth();

export async function render(container, { openInfluencer }) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Calendar</div>
        <div class="page-subtitle">Confirmed influencer stays</div>
      </div>
    </div>
    <div class="cal-layout">
      <div class="cal-main">
        <div class="cal-nav">
          <button class="btn btn-outline btn-sm" id="cal-prev">‹</button>
          <span class="cal-month-label" id="cal-label"></span>
          <button class="btn btn-outline btn-sm" id="cal-next">›</button>
          <button class="btn btn-ghost btn-sm" id="cal-today" style="margin-left:8px">Today</button>
        </div>
        <div id="cal-grid"></div>
      </div>
      <div class="cal-sidebar" id="cal-summary"></div>
    </div>`;

  let allInfluencers = [];
  try {
    allInfluencers = (await getInfluencers({})).filter(i => i.stay_start);
  } catch (e) { toast('Could not load calendar data', 'error'); }

  function go() {
    renderGrid(container, allInfluencers, _year, _month, openInfluencer);
    renderSummary(container, allInfluencers, _year, _month, openInfluencer);
    document.getElementById('cal-label').textContent = `${MONTH_NAMES[_month]} ${_year}`;
  }

  document.getElementById('cal-prev').addEventListener('click', () => {
    if (--_month < 0) { _month = 11; _year--; }
    go();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    if (++_month > 11) { _month = 0; _year++; }
    go();
  });
  document.getElementById('cal-today').addEventListener('click', () => {
    _year = new Date().getFullYear();
    _month = new Date().getMonth();
    go();
  });

  go();
}

// ── Build event objects ────────────────────────────────────

function buildEvents(influencers) {
  return influencers
    .filter(i => i.stay_start)
    .map((i, idx) => ({
      id:    i.id,
      name:  i.name,
      username: i.username || '',
      start: parseDate(i.stay_start),
      end:   parseDate(i.stay_end || i.stay_start),
      color: COLORS[idx % COLORS.length],
      initials: initials(i.name),
    }))
    .filter(e => e.start && e.end);
}

// ── Calendar grid ──────────────────────────────────────────

function renderGrid(container, influencers, year, month, openInfluencer) {
  const events = buildEvents(influencers);
  const grid   = document.getElementById('cal-grid');

  // Day-name header
  let html = `<div class="cal-header-row">${DAY_NAMES.map(d => `<div class="cal-header-cell">${d}</div>`).join('')}</div>`;

  // Build 6-week grid starting Monday
  const weeks = buildWeeks(year, month);

  for (const week of weeks) {
    const weekEvents = getWeekAssignments(events, week);
    const numTracks  = weekEvents.length ? Math.max(...weekEvents.map(a => a.track)) + 1 : 0;
    const bodyHeight = Math.max(40, numTracks * 28);

    html += `<div class="cal-week">`;
    // Day cells
    html += `<div class="cal-day-row">`;
    for (const d of week) {
      const today    = isToday(d);
      const otherMon = d.getMonth() !== month;
      html += `<div class="cal-day-cell ${today ? 'is-today' : ''} ${otherMon ? 'is-other' : ''}">
        <span class="cal-day-num">${d.getDate()}</span>
      </div>`;
    }
    html += `</div>`;

    // Event body
    html += `<div class="cal-event-body" style="height:${bodyHeight}px;position:relative">`;
    for (const a of weekEvents) {
      const leftPct  = (a.col / 7) * 100;
      const widthPct = (a.span / 7) * 100;
      const top      = a.track * 28;
      const radiusL  = a.isStart ? '20px' : '0';
      const radiusR  = a.isEnd   ? '20px' : '0';
      html += `
        <div class="cal-event-bar" data-id="${a.event.id}"
             style="left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);top:${top}px;
                    background:${a.event.color};border-radius:${radiusL} ${radiusR} ${radiusR} ${radiusL}">
          ${a.isStart ? `
            <span class="cal-event-ini" style="background:${darken(a.event.color)}">${a.event.initials}</span>
            <span class="cal-event-name">${a.event.name.split(' ')[0]}</span>
          ` : ''}
        </div>`;
    }
    html += `</div></div>`;
  }

  grid.innerHTML = html;

  // Click on event bar → open drawer
  grid.querySelectorAll('.cal-event-bar[data-id]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      openInfluencer(el.dataset.id);
    });
  });
}

// ── Summary panel ──────────────────────────────────────────

function renderSummary(container, influencers, year, month, openInfluencer) {
  const events = buildEvents(influencers);
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 0);

  const active = events
    .filter(e => e.end >= monthStart && e.start <= monthEnd)
    .sort((a, b) => a.start - b.start);

  const panel = document.getElementById('cal-summary');

  if (!active.length) {
    panel.innerHTML = `
      <div class="cal-summary-title">${MONTH_NAMES[month]}</div>
      <div class="text-muted text-sm" style="padding:16px 0">No stays this month</div>`;
    return;
  }

  panel.innerHTML = `
    <div class="cal-summary-title">${MONTH_NAMES[month]} <span style="font-weight:400;color:var(--muted)">${active.length} stay${active.length !== 1 ? 's' : ''}</span></div>
    <div class="cal-summary-list">
      ${active.map(e => `
        <div class="cal-summary-item" data-id="${e.id}" style="border-left:3px solid ${e.color}">
          <div class="cal-sum-ini" style="background:${e.color}">${e.initials}</div>
          <div class="cal-sum-info">
            <div class="cal-sum-name">${e.name}</div>
            <div class="cal-sum-dates">${fmtDateRange(e.start, e.end)}</div>
          </div>
        </div>`).join('')}
    </div>`;

  panel.querySelectorAll('.cal-summary-item[data-id]').forEach(el => {
    el.addEventListener('click', () => openInfluencer(el.dataset.id));
  });
}

// ── Week / track helpers ───────────────────────────────────

function buildWeeks(year, month) {
  // Start from Monday
  const first = new Date(year, month, 1);
  const startDow = (first.getDay() + 6) % 7; // Mon=0
  const start = new Date(first);
  start.setDate(1 - startDow);

  const weeks = [];
  for (let w = 0; w < 6; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }
  return weeks;
}

function getWeekAssignments(events, weekDays) {
  const wStart = weekDays[0];
  const wEnd   = weekDays[6];

  const overlapping = events
    .filter(e => e.end >= wStart && e.start <= wEnd)
    .sort((a, b) => a.start - b.start);

  const trackEnds = []; // trackEnds[i] = last end Date of that track
  const result    = [];

  for (const ev of overlapping) {
    const clampStart = ev.start < wStart ? wStart : ev.start;
    const clampEnd   = ev.end   > wEnd   ? wEnd   : ev.end;

    const col  = weekDays.findIndex(d => isSameDay(d, clampStart));
    const eCol = weekDays.findIndex(d => isSameDay(d, clampEnd));
    const span = eCol - col + 1;

    let track = trackEnds.findIndex(t => t < clampStart);
    if (track === -1) track = trackEnds.length;
    trackEnds[track] = clampEnd;

    result.push({
      event:   ev,
      col,
      span,
      track,
      isStart: isSameDay(ev.start, clampStart),
      isEnd:   isSameDay(ev.end,   clampEnd),
    });
  }

  return result;
}

// ── Utilities ──────────────────────────────────────────────

function parseDate(s) {
  if (!s) return null;
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function isToday(d) {
  return isSameDay(d, new Date());
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function darken(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - 30);
  const g = Math.max(0, ((n >> 8) & 0xff) - 30);
  const b = Math.max(0, (n & 0xff) - 30);
  return `rgb(${r},${g},${b})`;
}

function fmtDateRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const s = start.toLocaleDateString('en-US', opts);
  if (isSameDay(start, end)) return s;
  const e = end.toLocaleDateString('en-US', opts);
  return `${s} – ${e}`;
}
