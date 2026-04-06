// ============================================================
// Horizons Influencer Panel — Configuration
// Build-time env vars (js/env.js) take priority over localStorage
// ============================================================

import { ENV } from './env.js';

const CONFIG_KEY = 'horizons_config';

const DEFAULTS = {
  supabaseUrl:  '',
  supabaseKey:  '',
  attioWebhook: '',
};

export function getConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    const local = stored ? JSON.parse(stored) : {};
    return {
      ...DEFAULTS,
      ...local,
      // Build-time env always wins if set
      ...(ENV.supabaseUrl  ? { supabaseUrl:  ENV.supabaseUrl }  : {}),
      ...(ENV.supabaseKey  ? { supabaseKey:  ENV.supabaseKey }  : {}),
      ...(ENV.attioWebhook ? { attioWebhook: ENV.attioWebhook } : {}),
    };
  } catch {
    return { ...DEFAULTS, ...ENV };
  }
}

export function saveConfig(updates) {
  const current = getConfig();
  const next = { ...current, ...updates };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  return next;
}

export function isConfigured() {
  const cfg = getConfig();
  return !!(cfg.supabaseUrl && cfg.supabaseKey);
}
