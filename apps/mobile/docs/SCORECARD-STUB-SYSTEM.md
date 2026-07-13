# Sticket — "Scorecard Stub" Design System · Consolidated Engineering Handoff

Target: React Native + Reanimated (iOS-first). Reference boards in this project:
Phase A — UX Pass.dc.html · Phase B — Visual Directions.dc.html · Phase C batches 1–7.
All values below are final and signed off (decision log at the end).

---

## 1 · Tokens

### 1.1 Color (dark / light)

| Token    | Dark      | Light     | Use |
|----------|-----------|-----------|-----|
| bg       | `#0B0B10` | `#FAFAFC` | the stage |
| card     | `#15151C` | `#FFFFFF` | rows, cards |
| card2    | `#1E1E27` | `#F0F0F6` | elevated / pressed secondary |
| line     | `#23232E` | `#E7E6EF` | hairlines, borders (1px) |
| fg       | `#FFFFFF` | `#131218` | primary ink; primary button FILL (ink inversion) |
| text     | `#E9E9EF` | `#1A1922` | body |
| mute     | `#A6A6B3` | `#6C6B78` | secondary text |
| muteSoft | `#7C7C89` | `#9997A6` | eyebrows, mono labels |
| dash     | `#3A3A46` | `#C9C7D4` | planned/dashed borders, flat perforation |
| like/error | `#EF4444` | `#DC2626` | heart, destructive ONLY |
| success  | `#30D158` | `#1F9D50` | copied ✓, connected ✓ ONLY |

- **No accent hue exists (C1).** Active states are ink-weight, not color.
- Brand gradient `linear-gradient(90deg,#45E3FF,#7C5CFF,#EFA1EF)` appears in EXACTLY three places: (1) gradient "S"/wordmark on exported share cards + onboarding welcome, (2) TODAY divider on the timeline, (3) ~1s reveal flash. Nowhere else — enforce in review.
- Elevation: dark = soft shadow (`0 18px 40px rgba(0,0,0,.55)` at center-stage, 4px ambient elsewhere); light = hairline borders + `0 1px 3px rgba(19,18,24,.1)`.
- Photo overlays (scrims, embedded text, notches ON media) do NOT theme — media is always dark-scrimmed with white ink in both modes.
- Wallet barcode panel: pure `#FFFFFF` with black bars in both modes, always (C6).
- Show-mode: entire surface fixed-dark `#050508`, never themes (C10).

### 1.2 Type

SF system stack (no custom face licensed). Weight-led: 800 titles / 700 emphasis / 600 labels / 400 body.
Mono (SF Mono / JetBrains-class) is for DATA ONLY: scores, dates, counts, sec/row/seat, countdowns, codes. Uppercase + letterspaced (1–2.5px) for eyebrows/labels. `fontVariant: ['tabular-nums']` everywhere numbers align.

| Role | Size/Weight | Notes |
|---|---|---|
| Wordmark | 34/800 | -1px tracking |
| Page title | 24/800 | -0.6px |
| Card/artist title | 17/700 · on media 24–28/800 | -0.5px |
| Body | 13.5/400 | 1.5 line-height |
| Mono label | 10–11/600–700 | UPPERCASE, +1.5px |
| Score display | mono 800, tabular | feed/timeline chip 34px bare; deck center 44px; reveal 92px |

### 1.3 Shape & rhythm

Radius: chips 10 · cards 16 · **stubs 14** · heroes 22 · pills 999.
Spacing: screen pad 20 · card pad 18 · gap 14 (deck gap 12) · row height 68 · min hit target 44px.

### 1.4 Stub construction (the shape language, C3)

Perforation + notches appear ONLY on: logged memory cards, wallet tickets, joint posts, festival weekend stub, share cards, party invite card, duel "tonight" card. Never on plans, entities, settings.

- Perforation: 2px dashed line. On media: `rgba(255,255,255,.28)`. On flat surface: token `dash`.
- Notches: 18px circles (20px on share cards), centered on the perforation line at left/right edges, offset −9px, filled with the SURROUNDING surface color (bg), carrying the card's border on the inner half when the card is bordered.
- Ticket footer strip below the perforation: mono 10.5/600, letterspaced, `#D6D0C6` on media — venue line + `JUL 11 2026 · SEC 112 · ROW 8` left, `Nº 0047` / `ADMIT 01` right. Nº = the user's lifetime show count at time of logging.

### 1.5 The score's two bodies (C2)

- **On media:** bare giant mono digits, white, `textShadow 0 2 16 rgba(0,0,0,.6)`, top-right.
- **On flat surfaces:** the STAMP — mono 800 inside 2px `fg` border, radius 8 (14 at reveal size), rotated −4…+4° (deterministic per item: hash id → angle, so it never re-rolls).
- Never both at once.

---

## 2 · Components (construction notes)

- **Buttons.** Primary: fg-filled pill, bg-colored label, 13.5–15/600, pad 12–15px vertical (ink inversion; NEVER gradient/accent fill). Secondary: card2 fill. Ghost: mute text only. Pressed: scale .97 + opacity .85. Disabled: 35% opacity (30% light).
- **Chips.** Meta/data chip: 1px line border, radius 10, mono 11/700. Visibility chips: pill + 6px dot — active = fg border/ink, inactive = line border/mute; PRIVATE dot is outlined.
- **Cards.** Memory stub (media + scrim + embedded text + perforation + notches) · compact row (card bg, 1px line, radius 16; title 14/700, mono subline, score mono 18–20/800 right) · plan (1px dashed `dash`, radius 16, mono countdown right).
- **Stat row.** Mono 11.5/600: value in text-ink, label in muteSoft, 16px gaps, hairlines above/below.
- **Tab bar.** 4 tabs, 11/600. Active = fg + 4px dot below; inactive = muteSoft. No accent, no icons-only.
- **Inputs.** Radius 14, 1px line border, pad 12–14; focus = fg border (no glow).
- **Sheets.** Native slide-up, 38×4px grabber (line color), title 15–18/800.
- **Empty states.** Title 14.5/700 + one sentence selling the next action + one CTA. No illustrations.
- **Skeletons.** Shimmer = opacity .45→.9→.45, 1.4s ease-in-out infinite, staggered 150–200ms; shapes mirror the real layout's geometry.
- **Person rows.** 32px avatar, name 12.5/700, mono fact line (shared shows / seat / avg) — the graph is shows, not mutuals.

---

## 3 · Motion contract (Reanimated)

Global rules: transforms + opacity only, UI-thread (Reanimated worklets); one orchestrated moment per screen; nothing animates during active scroll except scroll-driven work; route transitions are NATIVE iOS push + swipe-back; modals are native sheets; fades ONLY for in-place view swaps.

| Trigger | Property | Duration | Curve | Haptic |
|---|---|---|---|---|
| Press any control | scale→.97, opacity→.85 | 120ms in | spring damping≈30, stiffness≈500 | light |
| Route push/pop | native slide | system | UIKit | none |
| Sheet present | native translateY | system | UIKit | none |
| In-place swap (Deck↔Map, feed scope) | opacity | 200ms | ease-out | none |
| Card enters list — "tear-in" | y +8→0, rotateZ 1.5°→0, opacity 0→1 | 240ms | cubic-bezier(.2,.7,.3,1) | none; 40ms stagger |
| Double-tap like | heart burst scale 0→1.2→1 | 350ms | spring 600/25 | light |
| Code copied | chip→✓ swap (success color) | 200ms, revert 1.2s | ease-out | light |
| Score count-up | text value | 900ms | ease-out | none |
| Stamp thunk | scale 1.3→1, rotateZ −8°→−3° | 220ms | spring 700/22 | **medium** |
| Milestone (threshold only) | card scale + confetti | 600ms | spring | success |

### 3.1 Reveal choreography (the app's only fireworks)

t=0 sheet up, digits at 0 (muted ink) → count-up starts · t=0.3s gradient flash ignites under digits, burns ~1s then dies · t=0.9s digits land, 100ms hold · t=1.2s stamp border + rank chip (`#3 OF 47`) thunk in, MEDIUM haptic · t=1.8s +XP chip fades, level bar fills (quiet) · t=2.4s milestone card + confetti IF real threshold (A8), SUCCESS haptic; else skipped · t=2.4/3.2s CTAs rise 12px + fade 240ms. Tap anywhere at any time jumps to end state.

### 3.2 The timeline wheel (You tab, C7 — supersedes C5 dimming)

Fixed stage, screen never scrolls. Cards ride a virtual drum:
- Center card: flat, scale 1, shadow `0 18px 40px rgba(0,0,0,.55)`.
- Neighbors: rotateX ±14° max (perspective 600), scale floor .92, shadow ramp 4→18px. **Opacity 1.0 always — depth is geometry + shadow, never dimming; neighbors stay fully readable.**
- Drag drives rotation 1:1; interpolate tilt/scale/shadow on arc position.
- Month readout (mono 15/800, fixed above stage) ticks when a card crosses the meridian — LIGHT haptic per tick.
- Release: velocity decay → nearest detent, 280ms spring (600/28); flicks skip multiple cards with a detent tick per pass.
- Deep links / Map taps: spin to target, 600ms max.
- TODAY divider = thin non-detent card carrying the gradient; the wheel glides past it.
- Reduced-motion: crossfade pager, detent haptics retained.

---

## 4 · Per-screen specs (§2 inventory, as rendered)

**Feed — waterfall (C22, amends A21's single column; keeps its no-chrome rule).** 2-col masonry, natural aspect ratios, 8px gutters, tear-in stagger on first paint. Crowd tile: photo (radius 12) + bare score mono 19/800 top-right + artist 12/800 + ONE caption line on the bottom scrim + degree facepile bottom-right ON the photo (20px circles, C15 rings, separation ring rgba(11,11,16,.8)); author row BELOW the photo (16px avatar, name 10/600, mono age + like count). A trending tag replaces the caption slot in mono (`#EUPHORIABRIDGE`). Entity tiles woven into the waterfall at masonry scale — event (date block + venue/price mono + facepile + dashed Interested), tour (80px media hero + rotated avg stamp + facepile footer + DATES →), artist (42px avatar + concrete reason + Track), venue (name + bare rating + `31 SEAT VIEWS · 5 UPCOMING →`). Rhythm: 1 entity tile per 5–6 crowd tiles, never two entity tiles adjacent on either axis. Header: wordmark + FRIENDS ▾ scope. Double-tap likes; tap opens memory/entity.

**Tab bar (C18, supersedes C16's four tabs).** Five positions: **Feed / Explore / [TIMELINE] / Plan / You**. Timeline is the raised center button — 52px fg-filled circle, lifted 22px above the bar, stub glyph (24×17 rounded rect, 2.5px bg-ink border, rotated −8°), shadow `0 8px 20px rgba(0,0,0,.45)`; stays fg-filled in both modes (ink inversion, never gradient/accent). Four flat labeled tabs keep the 4px active dot.

**Timeline (own tab, C16).** Header: month readout mono 15/800 left · Map pill · `+ Log` primary pill right (contextual chrome, still no FAB). Wheel per §3.2 with BIGGER portrait cards: center card ≈430px tall (up from ~330), neighbors 130px peek. Compact rows, plan cards, and the TODAY gradient card remain wheel cards. Map view: year sections, month tiles — photo thumb = shared, dot = logged, dashed ring = planned; tap spins the wheel to that card (≤600ms).

**Log flow.** Tonight card (pre-armed from wallet ticket dated today, A6) → details sheet: SEC/ROW/SEAT prefilled mono boxes, optional one-liner, primary `Rank it — 2 quick duels`, ghost `Save without ranking` → duel: eyebrow `COMPARE · 2 OF 3`, tonight card (fg border + notches) vs history card (line border); **historical scores hidden until chosen (A7)**; one `Too close — skip` per log → reveal (§3.1) → memory sheet: primary **Save for morning** (draft + 10:00 nudge, A9), then Post now / Skip. Log ≠ post — skipping keeps score/rank/XP.

**Memory composer (A22).** Section `THE SHOW` + REQUIRED badge (fg-filled): ≥1 photo/video of the show gates Post. Section `YOU + YOUR PEOPLE` + OPTIONAL badge (outlined): never blocks. Then caption → visibility chip → Post → plain-language exposure line ("Right now: 148 friends can see this.").

**Memory detail.** Full-bleed stub hero (carousel dots right edge), everything embedded; below: one mono action line, chip strip (SETLIST / VENUE TIPS / artist / venue), who-was-here + joint-post prompt, comments, pinned composer.

**Explore.** Omnisearch pill → PRESALES THIS WEEK (bordered list) → UPCOMING IN {CITY} (two media tiles) → TRENDING WITH FRIENDS.

**Upcoming (A17).** One agenda: THIS WEEK (presale entries; imminent = fg border + live mono countdown `02:14:09`) → TICKETED (stub notches + `41 D`) → INTERESTED (dashed). Presales are timed entries in this list, not a separate surface.

**Presale sheet (A16).** Countdown mono 40/800 tabular → code panel (fg border, `KDOT26` mono 16/800, tap-to-copy, light haptic, green ✓ 1.2s) → `Tickets at Ticketmaster · from $89` primary → track toggle. Zero navigation.

**Event.** Breadcrumb `‹ ARTIST › TOUR` mono → venue 24/800 + mono date → stat hairline row (avg/logs/memories) → YOUR NIGHT card with stamp → who-went facepile → crowd grid (3-up, +N overlay) → setlist row `HIDDEN · TAP TO REVEAL` → presale code card → tickets primary → parties dashed row.

**Artist.** Media hero (name embedded 30/800) → Tracking ✓ / Share → `YOU × ARTIST` card (seen / your avg / first year, mono) → ON TOUR rows → ALL TOURS with community avg scores.

**Venue.** Title + mono stat row (rating/capacity/seat photos) → Info / Seat views / Tips pills → seat browser: rows of `SEC 112` mono + ★ 4.6 + photo count + thumb → TOP TIP card with ▲ upvote block.

**Wallet.** Ticket stub: header (TONIGHT eyebrow, artist 22/800, tour stamp rotated) + SEC/ROW/SEAT boxes → perforation with notches → **pure-white barcode panel (C6)** + mono code, max brightness note → Show mode / Transfer buttons → future tickets as dashed rows.

**Show-mode (C10).** Fixed `#050508`. Header: artist 15/800 + mono `MSG · SEC 112 · SET STARTED 21:12`, EXIT pill. Viewfinder full-bleed, REC + zoom chips, corner note `FILES TO TONIGHT'S LOG / NOTHING POSTS NOW`. 76px capture ring, last-shot thumb + count, NOTE button, quick actions: Seat view shot (auto-tags section to venue seat browser) / Ticket. Battery % replaces signal dots.

**Onboarding (A1–A5).** Welcome (gradient wordmark, `?.?` stub teaser) → Connect (Spotify/Apple Music, one ask, "Right now: we read your top artists once…") → Radar live aha (list from listening, inline city change) → into the app. Résumé lane (recognition cards, catalog-matched only — scoped A3) and find-friends (after first reveal, A4) never gate.

**Settings & privacy (C9).** Appearance System/Dark/Light segmented; connected services with green ✓; privacy dials: SAME-SHOW DISCOVERY and TASTE MATCH each Off/Friends/Friends+/Everyone segmented + live consequence sentence ("Right now: friends of friends who were at your shows can see you… 12 shows overlap. Strangers can't."); default post visibility chips + sentence; SUMMARY card = whole exposure in four lines. No setting without its sentence.

**Notifications.** Timed/presale rows = fg-border urgent treatment; social = card-tone. Push templates lead with the payload (code, score+rank, count). Morning-after push at 10:00: "Last night: Kendrick, 8.7, #3 of 47. 14 photos are waiting."

**Party.** Breadcrumb → invite stub (fg border + notches: PRE-PARTY eyebrow, title 21/800, mono when/where, host row) → Going/Maybe/Can't (Going = primary fill) → facepile + counts → ANNOUNCEMENTS cards (pinned first) → dashed invite-matches row.

**Festival (C12).** Day tabs FRI/SAT/SUN segmented → stage-grouped set rows: mono time · artist 13.5/700 · tag line (LIVE SET / B2B / TECHNO / CLOSER); logged sets get mini stamps; ON NOW row = fg borders + `Log set` primary. Weekend rolls up to ONE stub on the wheel (`EDC '26 · 9 sets · 8.4 AVG`).

**Joint post (C13).** Dual-avatar pill `Maya × Jordan`; per-photo owner chip (`📷 MAYA'S SHOT`); BOTH scores side by side with mono name captions — never averaged; footer `SEC 112 × SEC 226` + `ADMIT 02`; one like count, one thread. Invite sheet: "his score stays his, yours stays yours" · Invite / Keep solo.

**Social sheets.** Likers (follow state per row), Who-was-here (respects each person's OWN discovery dial; shows the vector e.g. `VIA FRIENDS+`), Followers/Following tabs. Every row: 32px avatar + name + mono live-events fact.

**Badges (C11).** Stamp gallery: categories COUNTS / LOYALTY · RANGE / CONTRIBUTION · SOCIAL. Earned = solid fg stamp + earn date; locked = dashed `dash` stamp + exact distance (`3 TO GO`). No percent rings.

**Wrapped.** Intro: `'26` mono 96/800, stats stub with perforation, `ADMIT ONE MORE YEAR`, 12 cards. Share cards (C8): IG-story 1080×1920, ALWAYS dark-stage regardless of app theme; gradient S wordmark; milestone / memory / ranked-list / Wrapped layouts as rendered in batch 3.

**Plan — the planning HQ (C19, amends C16/C17: presales leave You).** Header: title 22/800 + `+ Party` primary pill (Parties subtab) / CALENDAR ▾ (Presales). Subtab pills PRESALES / PARTIES.
- **PRESALES:** THIS WEEK — imminent card (fg border) grows inline actions: code chip (`KDOT26` mono 12/800 + Copy) + Tickets primary; tracked rows below → TICKETED (notched stubs, `41 D`) → INTERESTED (dashed + facepile `+2 IN`).
- **PARTIES:** HOSTING (stub border + notches; join requests inline: requester avatar + shared-shows fact + Approve primary / Pass ghost) → GOING (host avatar with degree ring, `N GOING` mono) → INVITED (dashed, shows vector `VIA FRIENDS+`, Going/Can't) → create row ("Start a party — pick a show you're going to"). Create flow: pick show → name → visibility → invite.

**You — taste + memory collectible (C20, amends C17).** Compact header + trophy strip (bordered mono chips: `7 MO STREAK` · `2019 FIRST · OASIS` · `6 GENRES '26` · `#2 AMONG FRIENDS`) + subtabs ARTISTS / MAP.
- **ARTISTS — one line per followed artist:** ×N seen stamp (score-stamp body, dashed `×0` if never seen) · name 14/800 · who-tracks facepile (20px, C15) · comparison mono (`MAYA ×5 > YOU` / `DIEGO ×1 = YOU` / `MOST OF ANYONE`) · second line: `DROPS · <latest of: show announced / presale / on tour / new release>` mono + right-aligned `PLANNED ✓` in success green when ticketed/marked (with seat if known), else `NOT PLANNED` muteSoft.
- **MAP:** world/region map, pin per city sized by visit count (34px w/ count badge down to 20px), mono legend `NYC ×31 · LDN ×6`; below: venue rows (name + ×N stamp + AVG mono) and MOST SEEN · AMONG FRIENDS leaderboard (you highlighted). Public visitors see it filtered by privacy.

**Parties social (C21).** Explore rail gets a public-party card: title 14.5/800, event mono line, `N GOING`, host avatar with degree ring + `MAYA HOSTS · 2 FRIENDS GOING`, Join primary (request unless host set open-join). On OTHERS' timelines, a planned card with a party shows an inset strip: party facepile + `PARTY · 11 GOING` + `Apply to join` (fg-border ghost) + provenance line ("You're seeing this because Maya's plan is visible to friends"). Visibility obeys the plan's public/friends/FoF; applications land in the host's Plan › Parties queue. Owners never see the affordance on their own cards.

**Trends (C23).** Fan-made hashtags per tour/event. Chip row on event/tour pages: active trend = fg border + `#TAG count` mono, others line-border muted, dashed `+ TAG YOURS`. A tag crossing ~50 posts on one tour/event promotes to a HIGHLIGHTS rail on that page: 110×140 photo tiles (author + ♥ mono on scrim, +N overflow tile) titled `HIGHLIGHTS · #TAG` with `ALL N →`. On feed cards the tag takes the caption slot in mono. Ink only — count is the flex, no hue, no emoji.

**Seat bowl (C24) — event + venue pages.** Generic geometry from section names only: stage slab bottom-center (150×16, 1.5px fg border, mono STAGE letterspaced) → GA/floor block nearest (largest) → remaining sections sorted (100s/200s/300s or alpha) into concentric arcs of 3–7 blocks; arc curvature via per-block rotate ±9–18° + translateY (outer blocks lower). Block: 24–28px tall, radius 6, mono label. Filled = fg fill + `SEC·COUNT` in bg ink (has photos); hairline line-border = empty, still tappable → "be the first" empty state. Your section pulses once on open (event page). Tap section → sheet: `SEC 112` 15/800 + `★ 4.6 · 14 PHOTOS` mono, row-tagged photo grid + overflow, top tip + ▲ count.

**Launch choreography (C25) — cold launch only.** Splash on legacy deep-navy #07001F. Logo = S built from two fg tickets (64×26, radius 7, both rotated 32°, offset to interlock). [Timeline detail omitted — launch is being hand-authored by Vincent; keep the pulse+fade placeholder.]

### States (all five core screens, batch 2)
Empty = title + one sentence selling the next action + one CTA. Loading = shimmer geometry of the real layout (barcode loads last, always full-res). Error = plain language + single retry; log-save failure reads "Log saved on this phone… will sync itself. Nothing to redo."; barcode failure offers cached barcode + screenshot advice.

---

## 5 · Decision log (all signed off)

**Phase A (UX):** A1 aha = Spotify import → live presale radar · A2 city inline, never a gate · A3 backfill = recognition cards (SCOPED: catalog events only, no geo v1) · A4 find-friends after first reveal · A5 two-lane onboarding · A6 pre-armed Tonight card · A7 duel hides historical scores, one skip · A8 milestones only on real thresholds · A9 Save-for-morning default · A10 last-night resume card · A11 photos→caption→post, ratings optional accordion · A12 exposure legible at posting · A13 You×Them shared-history strip · A14 both-markers in browse · A15 follow CTA carries taste reason · A16 one presale sheet · A17 presales merge into agenda · A18 ticket→going auto-flip (SCOPED: in-app ticket add only, no purchase detection v1) · A19 text embedded on photo · A20 timeline float (superseded → C5 → C7 wheel) · A21 feed sheds Instagram chrome · A22 show media required, self optional · A23 motion budget.

**Phase B:** mix = B1 Stagelight neutrals/hairlines/giant numerals + B2 Stub shape language & motion signature. B3 killed; no acid tick.

**Phase C:** C1 zero accent hue · C2 score has two bodies · C3 stub = attended things only · C4 native nav, budgeted flourish · C5 fixed-stage deck (amended by C7) · C6 scanner surface sacred · C7 wheel physics — full-opacity neighbors, geometry-only depth · C8 gradient brand mark lives on share cards · C9 every dial states its consequence · C10 show-mode is a camera, fixed dark · C11 badges are earned stamps · C12 festival = days of sets, one stub · C13 joint posts pool media, never scores · C14 Explore = metered stream rhythm (rail → full-width → mosaic; crowd posts as connective tissue) · C15 degree is a ring, not a label (2px fg ring = friend, ringless = FoF, 26px/−8px overlap, cap 5 + overflow chip) · C16 nav = Feed / Explore / Timeline / You (wheel gets its own tab with portrait cards + header Log pill; Upcoming retired into You › PRESALES) · C17 You = tracking hub (amended by C19/C20) · C18 five tabs with raised fg Timeline circle (supersedes C16 nav) · C19 Plan = presales + parties HQ (presales leave You) · C20 You = taste + memory collectible (artist lines w/ DROPS + PLANNED ✓, map pins by visits, trophy strip) · C21 parties social (Explore public-party rail, apply-to-join on visited planned cards, host approves) · C22 feed = 2-col masonry waterfall with woven entity tiles (amends A21's single column) · C23 fan trends → earned HIGHLIGHTS rails (~50-post threshold, ink/mono only) · C24 generic seat-view bowl (arcs from section names; filled ink = has photos) · C25 launch = heartbeat ×2 + ticket-split reveal on #07001F.
