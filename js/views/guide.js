// ============================================================
// Horizons Influencer Panel — How to Use Guide
// ============================================================

export function render(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">How to Use</div>
        <div class="page-subtitle">Workflow rules, scoring system, and FAQ for the Horizons Influencer Panel</div>
      </div>
    </div>

    <div class="guide-layout">

      <!-- ── Left: TOC ── -->
      <nav class="guide-toc" id="guide-toc">
        <div class="guide-toc-title">Contents</div>
        <a class="guide-toc-link" href="#g-overview">Overview</a>
        <a class="guide-toc-link" href="#g-pipeline">Pipeline Stages</a>
        <a class="guide-toc-link" href="#g-search">Finding Influencers</a>
        <a class="guide-toc-link" href="#g-scoring">Import Score</a>
        <a class="guide-toc-link" href="#g-review">Review Scoring</a>
        <a class="guide-toc-link" href="#g-tiers">Tiers</a>
        <a class="guide-toc-link" href="#g-ftc">FTC Compliance</a>
        <a class="guide-toc-link" href="#g-rules">Rules &amp; Policy</a>
        <a class="guide-toc-link" href="#g-faq">FAQ</a>
      </nav>

      <!-- ── Right: Content ── -->
      <div class="guide-content">

        <!-- OVERVIEW -->
        <section class="guide-section" id="g-overview">
          <h2 class="guide-h2">Overview</h2>
          <p class="guide-p">
            The Horizons Influencer Panel is the internal tool for discovering, managing, and scoring influencer partnerships for Horizons glamping properties. It connects to kone.vc AI search, Supabase (database), and Attio (CRM) to give managers one place for the full influencer lifecycle.
          </p>
          <div class="guide-callout">
            <strong>Core principle:</strong> Every influencer goes through a structured pipeline — from Candidate to Complete. Nothing is skipped. Scoring happens after the campaign ends, not before.
          </div>
        </section>

        <!-- PIPELINE -->
        <section class="guide-section" id="g-pipeline">
          <h2 class="guide-h2">Pipeline Stages</h2>
          <p class="guide-p">Every influencer moves through 6 stages in order. You advance them manually using the <strong>Move to [Stage]</strong> button inside their profile.</p>

          <div class="guide-stage-list">
            <div class="guide-stage-row">
              <div class="guide-stage-name">1. Candidate</div>
              <div class="guide-stage-desc">
                Influencer has been found and imported. No contact made yet. Review their score, geo zone, and content fit. Complete the candidate checklist before advancing.
                <ul class="guide-ul">
                  <li>Verify follower count and engagement rate</li>
                  <li>Check geo zone (A = target state, B = border state, C = other)</li>
                  <li>Review content aesthetic and brand fit</li>
                  <li>Confirm no brand conflicts with competitors</li>
                </ul>
              </div>
            </div>
            <div class="guide-stage-row">
              <div class="guide-stage-name">2. Outreach</div>
              <div class="guide-stage-desc">
                First contact has been sent. Log the date. Follow up if no reply within 3 days. Only advance when interest is confirmed.
                <ul class="guide-ul">
                  <li>Send initial DM or email</li>
                  <li>Follow up after 3 days if no response</li>
                  <li>Log outreach date in the Notes field</li>
                  <li>Qualify: confirm they are interested and have capacity</li>
                </ul>
              </div>
            </div>
            <div class="guide-stage-row">
              <div class="guide-stage-name">3. Onboarding</div>
              <div class="guide-stage-desc">
                Influencer agreed. Send the brief, confirm deliverables, and set up promo code.
                <ul class="guide-ul">
                  <li>Send onboarding brief with story frame prompts</li>
                  <li>Confirm deliverables and stay dates</li>
                  <li>Set up personalised promo code (e.g. <strong>EMILY15</strong>) — edit it in the profile</li>
                  <li>Add FTC disclosure requirement to the brief</li>
                </ul>
              </div>
            </div>
            <div class="guide-stage-row">
              <div class="guide-stage-name">4. In Production</div>
              <div class="guide-stage-desc">
                Influencer is on-site or actively creating content.
                <ul class="guide-ul">
                  <li>Check in at day 3 of their stay</li>
                  <li>Confirm content schedule and formats</li>
                  <li>Monitor early story posts for compliance</li>
                </ul>
              </div>
            </div>
            <div class="guide-stage-row">
              <div class="guide-stage-name">5. Review</div>
              <div class="guide-stage-desc">
                Content has been delivered. Collect all assets and verify quality and compliance before scoring.
                <ul class="guide-ul">
                  <li>Collect all content assets (posts, reels, stories)</li>
                  <li>Verify FTC disclosure is present on every piece</li>
                  <li>Count saves, comments, link clicks for qCPE reference</li>
                  <li>Flag reusable assets for the content library</li>
                </ul>
              </div>
            </div>
            <div class="guide-stage-row">
              <div class="guide-stage-name">6. Complete</div>
              <div class="guide-stage-desc">
                Campaign is finished. Score the iteration, update the tier, and decide next steps.
                <ul class="guide-ul">
                  <li>Score iteration using the 3-block system (see Review Scoring)</li>
                  <li>Send thank-you message with next steps</li>
                  <li>Archive content with scenario and personality tags</li>
                  <li>Decide: invite back (Gold/Silver) or do not re-book (Not Rated)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <!-- SEARCH -->
        <section class="guide-section" id="g-search">
          <h2 class="guide-h2">Finding Influencers (AI Search)</h2>
          <p class="guide-p">
            The <strong>Search</strong> tab uses kone.vc to find influencers. The bridge server (<code>search_server.py</code>) must be running locally for search to work. The green dot in the top-right of the Search page confirms connection.
          </p>
          <div class="guide-callout guide-callout-warn">
            <strong>Important:</strong> kone.vc searches one state at a time and ANDs all filters together. Selecting too many states with narrow filters can return zero results. Start broad — one or two states, no follower limits — then narrow down.
          </div>
          <h3 class="guide-h3">How geo zones work</h3>
          <p class="guide-p">The panel automatically assigns a geo zone based on the influencer's listed location:</p>
          <div class="guide-table-wrap">
            <table class="guide-table">
              <thead><tr><th>Zone</th><th>States</th><th>Score bonus</th></tr></thead>
              <tbody>
                <tr><td><strong>A</strong></td><td>South Carolina, Texas, California, Tennessee, Ohio (+ Charlotte metro)</td><td>+35 pts</td></tr>
                <tr><td><strong>B</strong></td><td>States bordering Zone A (NC, GA, OK, AR, LA, NM, OR, NV, AZ, KY, VA, AL, MS, MO, PA, WV, IN, MI)</td><td>+20 pts</td></tr>
                <tr><td><strong>C</strong></td><td>All other locations or no location</td><td>+5 pts</td></tr>
              </tbody>
            </table>
          </div>
          <h3 class="guide-h3">Duplicate detection</h3>
          <p class="guide-p">
            Influencers already in the panel are marked <strong>IN PANEL</strong> in search results with a dimmed row and unchecked automatically. You can still re-import them if needed by checking the box manually — the system will skip them on save.
          </p>
        </section>

        <!-- IMPORT SCORE -->
        <section class="guide-section" id="g-scoring">
          <h2 class="guide-h2">Import Score (0–100)</h2>
          <p class="guide-p">
            The import score is calculated automatically when an influencer is added. It is a <strong>filtering and prioritisation score</strong> — it tells you who to look at first, not whether to book them.
          </p>
          <div class="guide-table-wrap">
            <table class="guide-table">
              <thead><tr><th>Factor</th><th>Max pts</th><th>Rules</th></tr></thead>
              <tbody>
                <tr><td>Geo Zone</td><td>35</td><td>Zone A = 35 · Zone B = 20 · Zone C = 5</td></tr>
                <tr><td>Engagement Rate</td><td>25</td><td>≥3% = 25 · ≥1.5% = 15 · ≥0.5% = 8 · &lt;0.5% = 0</td></tr>
                <tr><td>Followers</td><td>20</td><td>10K–100K = 20 (sweet spot) · 5K–10K = 15 · 1K–5K = 8 · &gt;100K = 10</td></tr>
                <tr><td>Content Relevance</td><td>20</td><td>+3 pts per keyword match (glamping, couples, lifestyle, travel, wellness, outdoor, nature, romance, adventure, family, retreat, getaway, staycation) — capped at 20</td></tr>
              </tbody>
            </table>
          </div>
          <div class="guide-callout">
            Score ≥75 = strong candidate · 45–74 = worth reviewing · &lt;45 = low priority
          </div>
        </section>

        <!-- REVIEW SCORING -->
        <section class="guide-section" id="g-review">
          <h2 class="guide-h2">Review Scoring (Post-Campaign)</h2>
          <p class="guide-p">
            After a campaign ends, score the iteration using <strong>3 weighted blocks</strong> on a 1–10 scale. Go to the influencer profile → Iterations tab → <strong>Score Iteration</strong>.
          </p>
          <div class="guide-table-wrap">
            <table class="guide-table">
              <thead><tr><th>Block</th><th>Weight</th><th>What to assess</th></tr></thead>
              <tbody>
                <tr><td><strong>Technical</strong></td><td>35%</td><td>Visual quality, cinematography, editing, production value, content reach and format variety</td></tr>
                <tr><td><strong>Communication</strong></td><td>25%</td><td>Responsiveness to messages, flexibility with changes, professionalism, ease of collaboration</td></tr>
                <tr><td><strong>Horizons Fit</strong></td><td>40%</td><td>How well the content captures the Horizons brand — romance, nature, premium feel, emotional storytelling</td></tr>
              </tbody>
            </table>
          </div>
          <p class="guide-p"><strong>Formula:</strong> Score = (Technical × 0.35) + (Communication × 0.25) + (Horizons Fit × 0.40)</p>

          <h3 class="guide-h3">Hard Veto rule</h3>
          <div class="guide-callout guide-callout-danger">
            If <strong>any single block scores below 4</strong>, the iteration is automatically marked <strong>Not Rated</strong> — regardless of the other scores. A 2 in Communication with a 10 in everything else is still Not Rated.
          </div>

          <h3 class="guide-h3">Border Cases</h3>
          <p class="guide-p">
            If the final score falls within ±0.3 of a tier threshold (8.0, 6.0, or 4.0), the system flags the result as a <strong>border case</strong> and recommends committee review before finalising the tier. This prevents one manager's judgement call from determining a tier alone.
          </p>
        </section>

        <!-- TIERS -->
        <section class="guide-section" id="g-tiers">
          <h2 class="guide-h2">Influencer Tiers</h2>
          <p class="guide-p">The tier is calculated as a rolling average of all iteration scores.</p>
          <div class="guide-table-wrap">
            <table class="guide-table">
              <thead><tr><th>Tier</th><th>Avg Score</th><th>Meaning</th></tr></thead>
              <tbody>
                <tr><td><strong style="color:var(--gold)">Gold</strong></td><td>≥ 8.0</td><td>Top performer. Priority for re-booking, ambassador programme, paid partnerships.</td></tr>
                <tr><td><strong style="color:#aaa">Silver</strong></td><td>≥ 6.0</td><td>Solid performer. Re-book for another stay if capacity allows.</td></tr>
                <tr><td><strong style="color:#cd7f32">Bronze</strong></td><td>≥ 4.0</td><td>Acceptable. Consider one more iteration before a decision.</td></tr>
                <tr><td><strong style="color:var(--danger)">Not Rated</strong></td><td>&lt; 4.0 or veto</td><td>Do not re-book. Archive the profile.</td></tr>
                <tr><td><strong style="color:var(--muted)">Unrated</strong></td><td>No iterations</td><td>No campaign completed yet.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- FTC -->
        <section class="guide-section" id="g-ftc">
          <h2 class="guide-h2">FTC Compliance</h2>
          <p class="guide-p">
            All influencer content for Horizons — including gifted stays and barter arrangements — is considered sponsored content under FTC guidelines and <strong>must be disclosed</strong>.
          </p>
          <h3 class="guide-h3">Accepted disclosure formats</h3>
          <ul class="guide-ul">
            <li><code>#ad</code>, <code>#sponsored</code>, <code>#gifted</code>, or <code>#partner</code> visible in the caption</li>
            <li>"Paid partnership with Horizons" label activated on Instagram</li>
          </ul>
          <h3 class="guide-h3">Rules</h3>
          <ul class="guide-ul">
            <li>Disclosure must appear <strong>before the "more" fold</strong> — not buried at the end</li>
            <li>For Stories: disclosure must appear on <strong>every individual frame</strong></li>
            <li>Vague phrases like "thanks to Horizons" are <strong>not sufficient</strong></li>
          </ul>
          <div class="guide-callout guide-callout-danger">
            Content without proper FTC disclosure must not be approved. Ask the influencer to repost with disclosure before marking the campaign complete.
          </div>
          <p class="guide-p">
            Confirm disclosure status on the <strong>Compliance tab</strong> inside each influencer profile. Toggle the confirmation once you have verified all content.
          </p>
        </section>

        <!-- RULES -->
        <section class="guide-section" id="g-rules">
          <h2 class="guide-h2">Rules &amp; Policy</h2>

          <h3 class="guide-h3">Booking rules</h3>
          <ul class="guide-ul">
            <li>Only book influencers who have reached <strong>Onboarding stage</strong> or beyond</li>
            <li>Confirm availability and deliverables <strong>in writing</strong> before booking a stay</li>
            <li>The standard promo code format is <strong>FIRSTNAME15</strong> (e.g. EMILY15) — edit it in the profile if needed</li>
            <li>Maximum 2 active influencer stays per property per month unless approved by management</li>
          </ul>

          <h3 class="guide-h3">Content ownership</h3>
          <ul class="guide-ul">
            <li>Content created during a gifted stay remains the influencer's intellectual property unless a paid usage rights agreement is in place</li>
            <li>Always ask before repurposing influencer content in Horizons ads or marketing materials</li>
            <li>Assets flagged as reusable in the Review checklist can be shared internally but not published without permission</li>
          </ul>

          <h3 class="guide-h3">Communication rules</h3>
          <ul class="guide-ul">
            <li>All outreach must be professional and on-brand — no spam-style mass DMs</li>
            <li>Never promise specific room types, dates, or rates without checking availability first</li>
            <li>Log all key communication in the Notes field of the influencer profile</li>
          </ul>

          <h3 class="guide-h3">Data &amp; access</h3>
          <ul class="guide-ul">
            <li>Panel accounts are issued to active team members only — do not share login credentials</li>
            <li>Influencer contact data (email, phone) must not be shared outside the team without consent</li>
            <li>Archive, do not delete, profiles when a campaign ends — records must be retained</li>
          </ul>
        </section>

        <!-- FAQ -->
        <section class="guide-section" id="g-faq">
          <h2 class="guide-h2">FAQ</h2>

          <div class="guide-faq">

            <div class="guide-faq-item">
              <div class="guide-faq-q">The bridge is offline — can I still use the panel?</div>
              <div class="guide-faq-a">Yes. The bridge (<code>search_server.py</code>) is only needed for AI Search. All other features — pipeline, candidates, scoring, settings — work without it. Ask your tech contact to start the bridge server if you need to run a search.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">An influencer shows up in search but is already in the panel. What happens if I import them again?</div>
              <div class="guide-faq-a">The row will show an <strong>IN PANEL</strong> badge and will be unchecked automatically. Even if you manually check it and click Import, the system will skip it — it matches by username and platform, so no duplicate is created.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">Can I change the geo zone of an influencer manually?</div>
              <div class="guide-faq-a">Not directly — the zone is computed from the location field. If the zone is wrong, update the location field in the influencer's profile. The score will recalculate on the next import. For existing profiles you can note the correct zone in the Notes field.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">What is the difference between Import Score and Tier?</div>
              <div class="guide-faq-a"><strong>Import Score</strong> (0–100) is calculated once at import based on location, followers, ER, and content keywords. It helps you prioritise who to contact first. <strong>Tier</strong> (Gold/Silver/Bronze/Not Rated) is calculated from post-campaign review scores and reflects actual performance.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">A score is flagged as a border case. What do I do?</div>
              <div class="guide-faq-a">A border case means the score landed within ±0.3 of a tier threshold (8.0, 6.0, or 4.0). The system flags it for committee review. Bring the scoring to your manager — two people should agree on the final tier before it is treated as definitive.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">How do I register a new team member?</div>
              <div class="guide-faq-a">Go to the Supabase dashboard → Authentication → Users → Invite user. Enter their work email. They will receive an invite link. Once they set a password, they can sign in at the panel URL. Do not create accounts for people outside the team.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">Can I delete an influencer profile?</div>
              <div class="guide-faq-a">Bulk delete is available in the Candidates view for unprocessed candidates. For influencers who have gone through any stage of the pipeline, use <strong>Archive</strong> instead of delete — this preserves the record and all scoring history.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">The influencer posted content without the FTC disclosure. What do I do?</div>
              <div class="guide-faq-a">Do not approve the content. Contact the influencer and ask them to edit the caption or repost with the correct disclosure. Document this in their Notes field. Do not mark the campaign as Complete until disclosure is confirmed and checked in the Compliance tab.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">Search is returning very few results from a specific state. Why?</div>
              <div class="guide-faq-a">kone.vc may not have strong coverage for that state at this time, or the filters are too narrow. Try: (1) remove follower limits, (2) broaden the category field or leave it empty, (3) select "Entire state" instead of specific cities. Results also vary by platform — try Instagram if TikTok returns little.</div>
            </div>

            <div class="guide-faq-item">
              <div class="guide-faq-q">Where is the promo code shown to the influencer?</div>
              <div class="guide-faq-a">You send it manually — the panel stores it for reference only. Copy it from the influencer's Overview tab (Affiliate Code field) and include it in your onboarding message. The format is FIRSTNAME15 by default — edit it in the profile if the influencer requests a different code.</div>
            </div>

          </div>
        </section>

      </div><!-- /guide-content -->
    </div><!-- /guide-layout -->`;

  // Smooth scroll for TOC links
  container.querySelectorAll('.guide-toc-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(link.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Highlight active TOC section on scroll
  const sections = container.querySelectorAll('.guide-section');
  const tocLinks  = container.querySelectorAll('.guide-toc-link');
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.addEventListener('scroll', () => {
      let current = '';
      sections.forEach(s => {
        if (mainContent.scrollTop + 80 >= s.offsetTop) current = '#' + s.id;
      });
      tocLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === current));
    }, { passive: true });
  }
}
