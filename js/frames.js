// ============================================================
// Horizons Influencer Panel — Story Frame Generator
// Direct data from horizons_influencer_system_v2.json
// ============================================================

export const SCENARIOS = [
  { id: 'couples',   label: 'Romance / Couples' },
  { id: 'birthday',  label: 'Birthday / Celebration' },
  { id: 'corporate', label: 'Corporate Offsite' },
  { id: 'family',    label: 'Families' },
  { id: 'wellness',  label: 'Wellness / Retreat' },
  { id: 'wedding',   label: 'Weddings' },
  { id: 'summit',    label: 'Summit / Strategy Session' },
  { id: 'sport',     label: 'Paddle Tennis / Sport' },
];

export const PERSONALITIES = [
  { id: 'adventurous', label: 'Adventurous / Explorer' },
  { id: 'romantic',    label: 'Romantic / Emotional' },
  { id: 'aesthetic',   label: 'Aesthetic / Visual' },
  { id: 'family',      label: 'Family-oriented' },
  { id: 'wellness',    label: 'Wellness / Mindful' },
  { id: 'social',      label: 'Social / Party' },
];

const FRAMES = {
  couples: {
    adventurous: [
      "Imagine your partner surprised you with a night in the middle of nowhere — no city noise, just stars and fire. How would you feel in that moment?",
      "What would you do if you had 48 hours completely to yourselves — no plans, no agenda?",
      "If you could design the perfect romantic escape for two, what would it look like?",
    ],
    romantic: [
      "Think about the last time you felt completely present with your partner. What made it possible?",
      "What does it feel like when the world disappears and it's just the two of you?",
      "If love had a place — a physical space that matched how you feel — what would it look like?",
    ],
    aesthetic: [
      "What does the perfect light for a romantic moment look like to you?",
      "If you were to capture intimacy in one image, what scene comes to mind?",
      "Walk us through the aesthetic of your ideal couple's retreat.",
    ],
    default: [
      "How would you react if someone organized a completely private escape for you and your partner?",
      "What's the most romantic thing a place has ever made you feel?",
      "Describe your ideal 'disappear from the world' moment with your person.",
    ],
  },
  birthday: {
    adventurous: [
      "What would your ideal 'disappear and celebrate' birthday look like?",
      "If your closest people could take over one day for you — what would they plan?",
      "What's the birthday experience you've never had but always wanted?",
    ],
    social: [
      "How do you like to celebrate — big energy or intimate?",
      "What's the vibe of your perfect birthday — who's there, what's happening?",
      "Describe the best birthday surprise you could imagine.",
    ],
    default: [
      "If you could celebrate your birthday anywhere, with no limitations — what would it look like?",
      "What does a meaningful birthday feel like to you, beyond the party?",
      "How would you feel if your people pulled off a completely private celebration just for you?",
    ],
  },
  corporate: {
    default: [
      "What does a team feel like when they're actually connecting — not just working?",
      "What's missing from most corporate retreats that makes them feel forgettable?",
      "If you could design one day that would change how your team sees each other, what would happen?",
    ],
  },
  family: {
    family: [
      "What's the trip that would make your kids talk about it for years?",
      "How do you find moments of real connection with your family in the noise of everyday?",
      "If you could give your family one unforgettable memory this year — what would it be?",
    ],
    default: [
      "What does quality family time actually look like when everything slows down?",
      "Describe the perfect off-grid family adventure — what's happening, who's there?",
      "What makes a place feel safe and magical for kids and adults at the same time?",
    ],
  },
  wellness: {
    wellness: [
      "What does it feel like when you finally stop and breathe — really breathe?",
      "Describe your perfect reset. What does it look and feel like?",
      "If rest had a place, what would that place be?",
    ],
    default: [
      "When was the last time you felt fully restored? What made that possible?",
      "What does your mind and body need when they've had enough?",
      "Design your ideal wellness retreat — what's essential, what's absent?",
    ],
  },
  wedding: {
    default: [
      "What does the perfect wedding backdrop look like to you?",
      "How do you imagine the transition from the ceremony to the celebration?",
      "What feeling do you want guests to carry with them after the day ends?",
    ],
  },
  summit: {
    default: [
      "What environment makes your best thinking happen?",
      "What does a productive strategy session feel like when everything clicks?",
      "How does space affect the quality of decisions your team makes?",
    ],
  },
  sport: {
    adventurous: [
      "What does it feel like to compete somewhere unexpected — away from courts and crowds?",
      "Describe your ideal sports weekend — where, who, what energy?",
      "What makes a sports experience memorable beyond the game itself?",
    ],
    default: [
      "What would it feel like to play at a private court with nothing around you but nature?",
      "How does the environment change the way you play and connect?",
      "Describe your ultimate outdoor sports escape.",
    ],
  },
};

// Returns array of 3 frame strings
export function getFrames(scenario, personality) {
  const scenarioFrames = FRAMES[scenario];
  if (!scenarioFrames) return [];
  return scenarioFrames[personality] || scenarioFrames['default'] || [];
}

export function getScenarioLabel(id) {
  return SCENARIOS.find(s => s.id === id)?.label || id;
}

export function getPersonalityLabel(id) {
  return PERSONALITIES.find(p => p.id === id)?.label || id;
}
