// ============================================================
// Horizons Influencer Panel — Attio Webhook Sender
// Fires events to Zapier → Attio pipeline
// Events: 'import' | 'stage_change' | 'iteration_saved'
// ============================================================

import { getConfig } from './config.js';

// Main entry point — called from db.js after each mutation
export async function sendAttioEvent(eventType, influencer, extra = {}) {
  const { attioWebhook } = getConfig();
  if (!attioWebhook) return { skipped: true };

  const payload = buildPayload(eventType, influencer, extra);

  try {
    const res = await fetch(attioWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, payload };
  } catch (err) {
    console.warn('[Attio] Webhook failed:', err.message);
    return { ok: false, error: err.message, payload };
  }
}

function buildPayload(eventType, influencer, extra) {
  const base = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    source: 'horizons_panel_v2',
  };

  // Fields synced on import (kone.vc data)
  if (eventType === 'import') {
    return {
      ...base,
      influencer: {
        name: influencer.name,
        username: influencer.username,
        email: influencer.email,
        platform: influencer.platform,
        followers: influencer.followers,
        engagement_rate: influencer.engagement_rate,
        location_raw: influencer.location_raw,
        geo_zone: influencer.geo_zone,
        import_score: influencer.import_score,
        status: influencer.status,
        panel_id: influencer.id,
      },
    };
  }

  // Fields synced on stage change
  if (eventType === 'stage_change') {
    return {
      ...base,
      influencer: {
        panel_id: influencer.id,
        name: influencer.name,
        username: influencer.username,
        email: influencer.email,
        status: influencer.status,
        tier: influencer.tier,
        ftc_disclosure_confirmed: influencer.ftc_disclosure_confirmed,
        current_campaign: influencer.current_campaign,
        current_scenario: influencer.current_scenario,
        affiliate_code: influencer.affiliate_code,
        ...extra,
      },
    };
  }

  // Fields synced on iteration save
  if (eventType === 'iteration_saved') {
    return {
      ...base,
      influencer: {
        panel_id: influencer.id,
        name: influencer.name,
        username: influencer.username,
        email: influencer.email,
        status: influencer.status,
        avg_iteration_score: influencer.avg_iteration_score,
        iterations_count: influencer.iterations_count,
        tier: influencer.tier,
        qcpe_last_iteration: influencer.qcpe_last_iteration,
        last_campaign: influencer.last_campaign,
      },
      iteration: extra.iteration || null,
    };
  }

  return { ...base, influencer, extra };
}
