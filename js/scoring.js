// ============================================================
// Horizons Influencer Panel — Scoring Engine
// Direct implementation of horizons_influencer_system_v2.json
// ============================================================

// Zone A — the 5 Horizons target states + their major cities
const ZONE_A = [
  // South Carolina + Charlotte metro
  'south carolina', ',sc', ' sc,', 'sc ', '(sc)',
  'columbia', 'charleston', 'greenville', 'spartanburg', 'myrtle beach', 'rock hill', 'florence',
  'charlotte', 'concord', 'gastonia', 'fort mill', 'huntersville', 'kannapolis', 'mooresville',
  // Texas
  'texas', ',tx', ' tx,', 'tx ', '(tx)',
  'houston', 'dallas', 'austin', 'san antonio', 'fort worth', 'el paso', 'arlington', 'plano',
  // California
  'california', ',ca', ' ca,', 'ca ', '(ca)',
  'los angeles', 'san francisco', 'san diego', 'san jose', 'sacramento', 'oakland', 'fresno', 'long beach',
  // Tennessee
  'tennessee', ',tn', ' tn,', 'tn ', '(tn)',
  'nashville', 'memphis', 'knoxville', 'chattanooga', 'clarksville', 'murfreesboro',
  // Ohio
  'ohio', ',oh', ' oh,', 'oh ', '(oh)',
  'columbus', 'cleveland', 'cincinnati', 'toledo', 'akron', 'dayton',
];

// Zone B — states that border any of the 5 target states
const ZONE_B = [
  // SC neighbors
  'north carolina', 'georgia',
  'charlotte', 'raleigh', 'asheville', 'durham', 'atlanta', 'savannah',
  ',nc', ',ga', ' nc,', ' ga,',
  // TX neighbors
  'oklahoma', 'arkansas', 'louisiana', 'new mexico',
  'oklahoma city', 'tulsa', 'new orleans', 'albuquerque',
  ',ok', ',ar', ',la', ',nm',
  // CA neighbors
  'oregon', 'nevada', 'arizona',
  'portland', 'las vegas', 'phoenix',
  ',or', ',nv', ',az',
  // TN neighbors
  'kentucky', 'virginia', 'alabama', 'mississippi', 'missouri',
  'louisville', 'richmond', 'birmingham', 'jackson', 'st. louis',
  ',ky', ',va', ',al', ',ms', ',mo',
  // OH neighbors
  'pennsylvania', 'west virginia', 'indiana', 'michigan',
  'pittsburgh', 'philadelphia', 'indianapolis', 'detroit',
  ',pa', ',wv', ',in', ',mi',
];

const CONTENT_KEYWORDS = [
  'glamping', 'couples', 'lifestyle', 'travel', 'wellness',
  'outdoor', 'nature', 'romance', 'adventure', 'family',
  'retreat', 'getaway', 'staycation',
];

// Returns 'A' | 'B' | 'C'
export function computeGeoZone(location = '') {
  const loc = location.toLowerCase();
  if (ZONE_A.some(k => loc.includes(k))) return 'A';
  if (ZONE_B.some(k => loc.includes(k))) return 'B';
  return 'C';
}

// Returns 0–100
export function computeImportScore({ geo_zone, engagement_rate, followers, content_text = '' }) {
  let score = 0;

  // Geo (35 pts)
  score += geo_zone === 'A' ? 35 : geo_zone === 'B' ? 20 : 5;

  // ER (25 pts)
  const er = parseFloat(engagement_rate) || 0;
  if (er >= 3) score += 25;
  else if (er >= 1.5) score += 15;
  else if (er >= 0.5) score += 8;

  // Followers (20 pts)
  const f = parseInt(followers) || 0;
  if (f >= 10000 && f <= 100000) score += 20;
  else if (f >= 5000) score += 15;
  else if (f >= 1000) score += 8;
  else if (f > 100000) score += 10;

  // Content relevance (20 pts, 3 pts per keyword hit, capped)
  const ct = content_text.toLowerCase();
  let kw = 0;
  for (const word of CONTENT_KEYWORDS) {
    if (ct.includes(word)) kw += 3;
  }
  score += Math.min(kw, 20);

  return Math.min(score, 100);
}

// Returns 0–100 from 4 axes (0–10 each)
export function computeIterationScore({ content_quality, value_received, content_longevity, qcpe_score }) {
  const sum = (Number(content_quality) || 0)
            + (Number(value_received) || 0)
            + (Number(content_longevity) || 0)
            + (Number(qcpe_score) || 0);
  return parseFloat(((sum / 40) * 100).toFixed(1));
}

// Returns 'Gold' | 'Silver' | 'Out' | 'Unrated'
export function computeTier(avgScore, iterationsCount) {
  if (!iterationsCount || iterationsCount === 0) return 'Unrated';
  if (avgScore >= 75 && iterationsCount >= 2) return 'Gold';
  if (avgScore >= 45) return 'Silver';
  return 'Out';
}

// Recalculates avg_score and tier after adding a new iteration
// existingIterations: array of { total_score }
// newScore: number
export function recalcTierData(existingIterations, newScore) {
  const allScores = [...existingIterations.map(i => Number(i.total_score)), newScore];
  const count = allScores.length;
  const avg = parseFloat((allScores.reduce((a, b) => a + b, 0) / count).toFixed(1));
  return {
    iterations_count: count,
    avg_iteration_score: avg,
    tier: computeTier(avg, count),
  };
}

// Generates affiliate code: 'EMILY15' from 'Emily Johnson'
export function generateAffiliateCode(name = '') {
  const first = (name.trim().split(/\s+/)[0] || 'CREATOR').toUpperCase().replace(/[^A-Z]/g, '');
  return `${first || 'CREATOR'}15`;
}

// Score colour: returns CSS variable name
export function scoreToCssClass(score) {
  if (score >= 75) return 'success';
  if (score >= 45) return 'gold';
  if (score >= 20) return 'muted';
  return 'danger';
}

// ER label
export function erLabel(er) {
  const v = parseFloat(er) || 0;
  if (v >= 3) return 'Excellent';
  if (v >= 1.5) return 'Good';
  if (v >= 0.5) return 'Average';
  return 'Low';
}

export const STAGE_ORDER = [
  'candidate', 'outreach', 'active', 'in_production', 'review', 'complete',
];

export const STAGE_LABELS = {
  candidate:    'Candidate',
  outreach:     'Outreach',
  active:       'Onboarding',
  in_production:'In Production',
  review:       'Review',
  complete:     'Complete',
  archived:     'Archived',
};

export const STAGE_CHECKLISTS = {
  candidate:    ['Verify follower count and ER', 'Check geo zone (A / B / C)', 'Review content quality and aesthetic fit', 'Confirm no brand conflicts'],
  outreach:     ['Send initial DM / email', 'Follow up if no reply in 3 days', 'Log outreach date', 'Qualify: confirm interest and content capacity'],
  active:       ['Send onboarding brief with story frames', 'Confirm deliverables and timeline', 'Set up personalised promo code (NAME15)', 'Confirm stay dates', 'Add FTC disclosure requirement to brief'],
  in_production:['Check in at day 3 of stay', 'Send midpoint encouragement message', 'Confirm content schedule and formats', 'Monitor early story posts'],
  review:       ['Collect all content assets', 'Review against deliverables checklist', 'Verify FTC disclosure present', 'Count saves, comments, link clicks (qCPE)', 'Flag reusable assets for library'],
  complete:     ['Score iteration across 4 axes', 'Update tier', 'Send thank you + next steps message', 'Archive content with scenario and personality tags', 'Decide: Gold / Silver / Out'],
};
