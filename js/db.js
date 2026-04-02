// ============================================================
// Horizons Influencer Panel — Data Layer (Supabase)
// ============================================================

import { getConfig } from './config.js';
import { computeGeoZone, computeImportScore, computeIterationScore, recalcTierData, generateAffiliateCode } from './scoring.js';
import { sendAttioEvent } from './attio.js';

let _supabase = null;

// ---- Init ----

export async function initDB() {
  const { supabaseUrl, supabaseKey } = getConfig();
  if (!supabaseUrl || !supabaseKey) return false;

  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    _supabase = createClient(supabaseUrl, supabaseKey);
    // Quick connectivity test
    const { error } = await _supabase.from('influencers').select('id').limit(1);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('[DB] Init failed:', err.message);
    _supabase = null;
    return false;
  }
}

function db() {
  if (!_supabase) throw new Error('Supabase not initialised. Configure in Settings.');
  return _supabase;
}

// ---- Influencers ----

export async function getInfluencers(filters = {}) {
  let q = db().from('influencers').select('*').order('import_score', { ascending: false });

  if (filters.status)   q = q.eq('status', filters.status);
  if (filters.tier)     q = q.eq('tier', filters.tier);
  if (filters.geo_zone) q = q.eq('geo_zone', filters.geo_zone);
  if (filters.platform) q = q.eq('platform', filters.platform);
  if (filters.search)   q = q.ilike('name', `%${filters.search}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function getInfluencer(id) {
  const { data, error } = await db()
    .from('influencers')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createInfluencer(raw) {
  const geo_zone    = computeGeoZone(raw.location_raw || raw.location || '');
  const contentText = [raw.category, raw.bio_keywords, raw.username, raw.name].filter(Boolean).join(' ');
  const import_score = computeImportScore({
    geo_zone,
    engagement_rate: raw.engagement_rate,
    followers: raw.followers,
    content_text: contentText,
  });
  const affiliate_code = raw.affiliate_code || generateAffiliateCode(raw.name);

  const record = {
    name: raw.name || '',
    username: raw.username || '',
    email: raw.email || '',
    platform: raw.platform || 'instagram',
    followers: parseInt(raw.followers) || 0,
    engagement_rate: parseFloat(raw.engagement_rate) || 0,
    location_raw: raw.location_raw || raw.location || '',
    geo_zone,
    import_score,
    affiliate_code,
    status: 'candidate',
    tier: 'Unrated',
    notes: raw.notes || '',
  };

  const { data, error } = await db().from('influencers').insert(record).select().single();
  if (error) throw error;

  sendAttioEvent('import', data).catch(() => {});
  return data;
}

export async function bulkCreateInfluencers(rows) {
  const records = rows.map(raw => {
    const geo_zone = computeGeoZone(raw.location_raw || raw.location || '');
    const contentText = [raw.category, raw.bio_keywords, raw.username, raw.name].filter(Boolean).join(' ');
    const import_score = computeImportScore({
      geo_zone,
      engagement_rate: raw.engagement_rate,
      followers: raw.followers,
      content_text: contentText,
    });
    return {
      name: raw.name || '',
      username: raw.username || '',
      email: raw.email || '',
      platform: (raw.platform || 'instagram').toLowerCase(),
      followers: parseInt(raw.followers) || 0,
      engagement_rate: parseFloat(raw.engagement_rate) || 0,
      location_raw: raw.location_raw || raw.location || '',
      geo_zone,
      import_score,
      affiliate_code: raw.affiliate_code || generateAffiliateCode(raw.name),
      status: 'candidate',
      tier: 'Unrated',
      notes: raw.notes || '',
    };
  });

  const { data, error } = await db().from('influencers').insert(records).select();
  if (error) throw error;

  // Fire Attio for each in background
  (data || []).forEach(inf => sendAttioEvent('import', inf).catch(() => {}));
  return data || [];
}

export async function updateInfluencer(id, updates) {
  const { data, error } = await db()
    .from('influencers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function advanceStage(influencer, targetStatus) {
  const updated = await updateInfluencer(influencer.id, { status: targetStatus });
  sendAttioEvent('stage_change', updated, { previous_status: influencer.status }).catch(() => {});
  return updated;
}

export async function archiveInfluencer(id) {
  return updateInfluencer(id, { status: 'archived' });
}

// ---- Iterations ----

export async function getIterations(influencerId) {
  const { data, error } = await db()
    .from('iterations')
    .select('*')
    .eq('influencer_id', influencerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function createIteration(influencerId, form) {
  const total_score = computeIterationScore(form);

  // Insert iteration
  const { data: iter, error: iterErr } = await db()
    .from('iterations')
    .insert({
      influencer_id: influencerId,
      campaign_name: form.campaign_name || '',
      scenario: form.scenario || '',
      content_quality: Number(form.content_quality),
      value_received: Number(form.value_received),
      content_longevity: Number(form.content_longevity),
      qcpe_score: Number(form.qcpe_score),
      total_score,
      notes: form.notes || '',
    })
    .select()
    .single();

  if (iterErr) throw iterErr;

  // Recalc tier — fetch all existing iterations for rolling avg
  const { data: allIters } = await db()
    .from('iterations')
    .select('total_score')
    .eq('influencer_id', influencerId);

  const { iterations_count, avg_iteration_score, tier } = recalcTierData(
    (allIters || []).filter(i => i.id !== iter.id),
    total_score,
  );

  // Update influencer
  const updated = await updateInfluencer(influencerId, {
    iterations_count,
    avg_iteration_score,
    tier,
    qcpe_last_iteration: Number(form.qcpe_score),
    last_campaign: form.campaign_name || '',
  });

  sendAttioEvent('iteration_saved', updated, { iteration: iter }).catch(() => {});
  return { iteration: iter, influencer: updated };
}

// ---- Stats for dashboard ----

export async function getDashboardStats() {
  const { data: influencers } = await db().from('influencers').select('status,tier,geo_zone,import_score');

  const total    = influencers?.length || 0;
  const gold     = influencers?.filter(i => i.tier === 'Gold').length || 0;
  const silver   = influencers?.filter(i => i.tier === 'Silver').length || 0;
  const unrated  = influencers?.filter(i => i.tier === 'Unrated').length || 0;
  const pipeline = {};

  for (const inf of (influencers || [])) {
    pipeline[inf.status] = (pipeline[inf.status] || 0) + 1;
  }

  return { total, gold, silver, unrated, pipeline };
}

export async function getTopPerformers(limit = 5) {
  const { data, error } = await db()
    .from('influencers')
    .select('id,name,username,tier,avg_iteration_score,qcpe_last_iteration,geo_zone')
    .not('avg_iteration_score', 'is', null)
    .order('avg_iteration_score', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getRecentImports(limit = 8) {
  const { data, error } = await db()
    .from('influencers')
    .select('id,name,username,platform,import_score,geo_zone,tier,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
