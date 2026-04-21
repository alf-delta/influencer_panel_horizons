// ============================================================
// Horizons Influencer Panel — Stage Scripts
// Static content per pipeline stage: opener, objections, closing
// ============================================================

export const STAGE_SCRIPTS = {

  candidate: {
    label: 'Candidate — First Contact',
    color: 'var(--peach)',
    opener: {
      title: 'Opening',
      text: `Hi [Name]! I'm [Manager] from Horizons Getaways — a luxury resort in the Sandhills of South Carolina. I came across your content and really love your style. We're building a creator program and think you'd be a perfect fit. Would you be open to a complimentary stay in exchange for a small content package?`,
    },
    objections: [
      {
        q: 'How much do you pay?',
        a: `We don't pay a cash fee — instead we offer a fully hosted stay (private cabin, full amenities) worth $X/night. Many creators say the experience itself is the real value, and the content practically makes itself.`,
      },
      {
        q: `I don't do sponsored content.`,
        a: `Totally understand — this is more of a hosted stay than a sponsorship. You experience Horizons as a guest and share your genuine take. No scripted ads, no brand voice requirements. Just the content you'd want to make anyway.`,
      },
      {
        q: `I'm too busy right now.`,
        a: `No rush at all — we work entirely around your schedule. We just need a 2–3 night window, and we can plan months in advance. Want me to send over the details so you have them for when timing works?`,
      },
      {
        q: `What is Horizons Getaways?`,
        a: `Horizons is a private nature resort in the Sandhills of South Carolina — think luxury cabins, lake access, nature trails, sport courts and full-service amenities. It's a unique backdrop for lifestyle, travel and couples content.`,
      },
      {
        q: `How many creators do you work with?`,
        a: `We keep the program selective — we work with a limited number of creators per season so each stay gets real attention. That's why I reached out to you specifically.`,
      },
    ],
    closing: {
      title: 'Closing',
      text: `I'd love to send over our collaboration guide — it covers what a typical stay looks like, the content we'd appreciate, and how other creators have worked with us. Would that be helpful?`,
    },
  },

  outreach: {
    label: 'Outreach — Negotiation',
    color: 'var(--lavender)',
    opener: {
      title: 'Opening',
      text: `Hey [Name], following up on our conversation! We'd love to move forward and lock in a stay for you at Horizons. I have a few open windows this season — want to take a look at what might work for your schedule?`,
    },
    objections: [
      {
        q: `What exactly would I need to post?`,
        a: `The package is flexible — typically 1–2 Reels or TikToks, 2–3 Stories, tagged @gohorizons. That's it. The format, style and story are entirely yours. We also love raw materials if you're willing to share footage.`,
      },
      {
        q: `Can I bring a partner or friend?`,
        a: `Absolutely — most of our creators come as a couple or with a friend. It actually makes for better content! Just let me know how many guests so we can set up the right cabin.`,
      },
      {
        q: `I need to think about it.`,
        a: `Of course, take your time. I'll hold a tentative spot for you. Would it help if I sent the full brief so you can picture exactly what the stay looks like before deciding?`,
      },
      {
        q: `Can I also post about other things during the trip?`,
        a: `Yes — your feed is yours. We just ask that Horizons content goes up within 3 days of checkout. Everything else during the trip is completely up to you.`,
      },
      {
        q: `What if the content doesn't perform well?`,
        a: `We're not running performance-based collabs — we value authentic content and the genuine experience. There are no penalties for reach or views.`,
      },
    ],
    closing: {
      title: 'Confirm & Next Step',
      text: `Great — let me send you the full brief and a few available dates. Once you pick a window I'll confirm the booking and we're all set. Really looking forward to having you at Horizons!`,
    },
  },

  active: {
    label: 'Active — Contract & Onboarding',
    color: 'var(--sky)',
    opener: {
      title: 'Opening',
      text: `Hi [Name]! So exciting — your stay at Horizons is officially moving forward. I'm sending over our collaboration agreement now. It's a simple one-pager: dates, deliverables and tags. Please sign and reply so I can finalize your booking.`,
    },
    objections: [
      {
        q: `I don't sign contracts.`,
        a: `Completely understood. This isn't a legal demand — it's a shared reference doc so both sides stay aligned. One page, no legal jargon. I'm happy to walk you through every line before you sign.`,
      },
      {
        q: `Can we adjust the deliverables?`,
        a: `Yes, within reason. Tell me what format you're most comfortable with and we'll shape the brief around that. Our goal is content you're genuinely proud of.`,
      },
      {
        q: `What if I need to reschedule?`,
        a: `No problem — we can reschedule once at no penalty. Just give us at least 5 days' notice and I'll find a new window that works for both sides.`,
      },
      {
        q: `What's included in the stay?`,
        a: `Private cabin, all amenities, full access to lake, trails, sport courts and common spaces. We'll share a full welcome packet with check-in instructions once the agreement is signed.`,
      },
    ],
    closing: {
      title: 'Closing',
      text: `Once the agreement is signed I'll send your booking confirmation, a welcome packet with check-in details, and the full content brief. Any questions before then — I'm here!`,
    },
  },

  in_production: {
    label: 'In Production — Stay Coordination',
    color: 'var(--amber)',
    opener: {
      title: 'Pre-Stay Briefing',
      text: `Hey [Name]! Your Horizons stay is coming up on [Date] — so excited to have you! Quick reminder: we'd love [X Reels + Y Stories] tagged @gohorizons, posted within 3 days of checkout. I'll share our Google Drive link for raw material uploads on arrival. Anything I can prep for you beforehand?`,
    },
    objections: [
      {
        q: `I'm not sure what to film.`,
        a: `No worries — I'll share an optional shot list with ideas: lake activities, cabin interior, dining, evening ambiance, trails. Take what inspires you and ignore the rest. The brief has everything laid out.`,
      },
      {
        q: `The weather might not cooperate.`,
        a: `We've got beautiful indoor and covered spots — the common areas, bar, game room and lounge all photograph brilliantly. Great content happens rain or shine at Horizons.`,
      },
      {
        q: `Can I post from the trip in real time?`,
        a: `Yes! Stories and real-time content are great. We just ask that the main Reels/videos go up after checkout so you have time to edit them properly.`,
      },
      {
        q: `Can I bring extra equipment or a photographer?`,
        a: `Absolutely. Just let us know in advance so we can make sure access and logistics are sorted. We want you to create your best work.`,
      },
    ],
    closing: {
      title: 'Closing',
      text: `Have an incredible stay — I'm reachable by message the whole time if anything comes up. Don't forget to upload raw materials to the Drive within 3 days of checkout. Can't wait to see what you create!`,
    },
  },

  review: {
    label: 'Review — Post-Stay Scoring',
    color: 'var(--rose)',
    opener: {
      title: 'Opening',
      text: `Hi [Name]! Hope you had an amazing time at Horizons — the whole team was so happy to have you. I wanted to check in: how was the experience overall? And just a heads up, the content package is due within 3 days of checkout. Let me know if you need any extra time.`,
    },
    objections: [
      {
        q: `I haven't posted yet.`,
        a: `No worries — take the time you need to edit it properly. Just let me know a rough date so I can keep our team informed, and I'll flag it internally as on the way.`,
      },
      {
        q: `The content didn't perform as well as I expected.`,
        a: `That's completely fine — performance varies by timing and algorithm. What matters to us is authentic content and a genuine experience. We're happy with everything you created.`,
      },
      {
        q: `I had some issues during the stay.`,
        a: `I'm really sorry to hear that — please tell me more. Your feedback shapes how we improve the experience for future creators and guests. We take it seriously.`,
      },
      {
        q: `When will I hear about the next collab?`,
        a: `We score each iteration and circle back within a few weeks. Creators who we love working with go into our priority list for next season. Looking forward to hopefully having you back!`,
      },
    ],
    closing: {
      title: 'Closing',
      text: `Thank you so much for partnering with Horizons — this collab means a lot to the whole team. Once I've reviewed your content I'll follow up with feedback and next steps. Talk soon!`,
    },
  },

  complete: {
    label: 'Complete — Re-engagement',
    color: 'var(--mint)',
    opener: {
      title: 'Opening',
      text: `Hey [Name]! It was such a pleasure having you at Horizons — the team absolutely loved your content. We'd love to have you back for next season. Want me to add you to our priority creator list so you hear about new dates first?`,
    },
    objections: [
      {
        q: `What's coming up next?`,
        a: `We're planning the next creator season for [Month/Quarter]. Priority slots go to returning creators first — I'll reach out as soon as dates open up.`,
      },
      {
        q: `Can you offer a longer stay or upgrade?`,
        a: `For returning Gold-tier creators we often extend stays or offer upgraded cabins. Let's see what we can arrange when the season opens — I'll keep you in mind.`,
      },
      {
        q: `Can I refer a creator friend?`,
        a: `We'd love that! Send me their handle and I'll have a look. If they're a good fit we'll reach out and mention your name.`,
      },
    ],
    closing: {
      title: 'Closing',
      text: `I'll add you to our VIP re-engagement list — you'll hear from me first when new windows open. Thanks again, [Name]. You were a true pleasure to work with and we hope to see you soon!`,
    },
  },

};
