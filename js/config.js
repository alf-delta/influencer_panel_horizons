// ============================================================
// Horizons Influencer Panel — Configuration
// Stored in localStorage, editable from Settings view
// ============================================================

const CONFIG_KEY = 'horizons_config';

const DEFAULTS = {
  supabaseUrl: '',   // e.g. https://xxxx.supabase.co
  supabaseKey: '',   // anon public key
  attioWebhook: '',  // Zapier webhook URL → Attio
};

export function getConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
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
