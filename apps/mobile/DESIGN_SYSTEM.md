# Sticket — "Scorecard Stub" Design System · Consolidated Engineering Handoff

> Source: Claude Design project "Sticket UX/UI Redesign" (Phase A UX pass · Phase B visual
> directions · Phase C batches 1–4). All values final and signed off 2026-07-13; decision log
> at the end. Target: React Native + Reanimated (iOS-first).

## 1 · Tokens

### 1.1 Color (dark / light)

| token | dark | light | use |
|---|---|---|---|
| bg | #0B0B10 | #FAFAFC | the stage |
| card | #15151C | #FFFFFF | rows, cards |
| card2 | #1E1E27 | #F0F0F6 | elevated, pressed secondary |
| line | #23232E | #E7E6EF | hairlines, borders (1px) |
| fg | #FFFFFF | #131218 | primary ink; primary button FILL (ink inversion) |
| text | #E9E9EF | #1A1922 | body |
| mute | #A6A6B3 | #6C6B78 | secondary text |
| muteSoft | #7C7C89 | #9997A6 | eyebrows, mono labels |
| dash | #3A3A46 | #C9C7D4 | planned/dashed borders, flat perforation |
| like/error | #EF4444 | #DC2626 | heart, destructive ONLY |
| success | #30D158 | #1F9D50 | copied ✓, connected ✓ ONLY |

Rules:
- **No accent hue exists (C1).** Active states are ink-weight, not color.
- Brand gradient `linear-gradient(90deg, #45E3FF, #7C5CFF, #EFA1EF)` appears in EXACTLY three
  places: (1) gradient "S"/wordmark on exported share cards + onboarding welcome, (2) TODAY
  divider, (3) ~1s reveal flash. Enforce in review.
- Elevation: dark = soft shadow (0 18px 40px rgba(0,0,0,.55) at wheel center, 4px ambient
  elsewhere); light = hairlines + 0 1px 3px rgba(19,18,24,.1).
- Media never themes: scrims, embedded text, and notches ON photos stay dark-scrimmed with
  white ink in both modes.
- Wallet barcode panel: pure #FFFFFF, black bars, both modes, always (C6).
- Show-mode surface: fixed #050508, never themes (C10).

### 1.2 Type

SF system stack, weight-led: 800 titles / 700 emphasis / 600 labels / 400 body. Mono
(JetBrains Mono) for DATA ONLY: scores, dates, counts, sec/row/seat, countdowns, codes —
UPPERCASE + letterspaced (1–2.5px) labels, `fontVariant: ['tabular-nums']` wherever numbers
align.

- Wordmark 34/800 (−1px tracking) · Page title 24/800 (−0.6px) · Card title 17/700; artist on
  media 24–28/800
- Body 13.5/400, 1.5 line-height · Mono label 10–11/600–700
- Score display: mono 800 tabular — 34px bare on feed/timeline media, 44px wheel center,
  92px reveal

### 1.3 Shape & rhythm

Radius: chips 10 · cards 16 · stubs 14 · heroes 22 · pills 999. Spacing: screen pad 20 ·
card pad 18 · gap 14 (wheel gap 12) · row height 68 · min hit target 44px.

### 1.4 Stub construction (C3)

Perforation + notches ONLY on attended things: logged memories, wallet tickets, joint posts,
festival weekend stub, share cards, party invite, duel "tonight" card. Never on plans,
entities, settings.

- Perforation: 2px dashed — rgba(255,255,255,.28) on media, token `dash` on flat.
- Notches: 18px circles (20px on share cards), centered on the perforation at left/right
  edges (−9px offset), filled with the SURROUNDING surface color; carry the card's border on
  the inner half when bordered.
- Ticket footer below perforation: mono 10.5/600 letterspaced — venue + `JUL 11 2026 ·
  SEC 112 · ROW 8` left, `Nº 0047` / `ADMIT 01` right. Nº = lifetime show count at logging.

### 1.5 The score's two bodies (C2)

- On media: bare giant mono digits, white, textShadow 0 2 16 rgba(0,0,0,.6), top-right.
- On flat: the STAMP — mono 800 in a 2px fg border, radius 8 (14 at reveal), rotated −4…+4°,
  angle deterministic per item (hash id → angle, never re-rolls).
- Never both at once.

## 2 · Components (construction notes)

- **Buttons.** Primary: fg-filled pill, bg-colored label, 13.5–15/600, 12–15px vertical pad
  (ink inversion; never gradient/accent fill). Secondary: card2 fill. Ghost: mute text.
  Pressed: scale .97 + opacity .85. Disabled: 35% (dark) / 30% (light).
- **Chips.** Data chip: 1px line border, radius 10, mono 11/700. Visibility: pill + 6px dot —
  active = fg border/ink; inactive = line/mute; PRIVATE dot outlined.
- **Cards.** Memory stub (media + scrim + embedded text + perforation + notches) · compact
  row (card bg, 1px line, radius 16, title 14/700, mono subline, score 18–20/800 right) ·
  plan (1px dashed, radius 16, mono countdown).
- **Stat row.** Mono 11.5/600: values in text-ink, labels muteSoft, 16px gaps, hairlines
  above/below.
- **Tab bar.** 4 tabs, 11/600; active = fg + 4px dot; inactive muteSoft.
- **Inputs.** Radius 14, line border, pad 12–14; focus = fg border, no glow.
- **Sheets.** Native slide-up, 38×4 grabber (line color), title 15–18/800.
- **Empty states.** Title 14.5/700 + one action-selling sentence + one CTA. No illustrations.
- **Skeletons.** Opacity .45→.9→.45, 1.4s ease-in-out infinite, 150–200ms stagger; geometry
  mirrors the real layout.
- **Person rows.** 32px avatar, name 12.5/700, mono live-events fact (shared shows / seat /
  avg).

## 3 · Motion contract (Reanimated)

Global: transforms + opacity only, UI-thread worklets; one orchestrated moment per screen;
nothing animates during active scroll except scroll-driven work; NATIVE iOS push +
swipe-back; native sheets; fades only for in-place swaps.

| Trigger | Property | Duration | Curve | Haptic |
|---|---|---|---|---|
| Press | scale .97, opacity .85 | 120ms | spring 500/30 | light |
| Push/pop | native slide | system | UIKit | none |
| Sheet | native translateY | system | UIKit | none |
| In-place swap | opacity | 200ms | ease-out | none |
| Tear-in | y +8→0, rotateZ 1.5°→0, fade | 240ms | cubic(.2,.7,.3,1) | none · 40ms stagger |
| Double-tap like | burst 0→1.2→1 | 350ms | spring 600/25 | light |
| Code copied | chip→✓ | 200ms, revert 1.2s | ease-out | light |
| Count-up | text value | 900ms | ease-out, UI thread | none |
| Stamp thunk | scale 1.3→1, rotZ −8°→−3° | 220ms | spring 700/22 | medium |
| Milestone | card + confetti | 600ms | spring | success |

**Reveal:** t=0 sheet up, digits 0 muted, count-up starts · 0.3s gradient flash ignites (~1s
burn) · 0.9s digits land, 100ms hold · 1.2s stamp + rank thunk, MEDIUM haptic · 1.8s XP chip +
level bar (quiet) · 2.4s milestone IF threshold (A8), SUCCESS haptic, else skipped · CTAs
rise 12px/fade 240ms. Tap anywhere → end state.

**The wheel (C7, supersedes C5 dimming):** fixed stage, never scrolls. Center card
flat/scale 1/shadow 18px. Neighbors rotateX ±14° (perspective 600), scale floor .92, shadow
ramp 4→18px, opacity 1.0 always — depth is geometry + shadow, neighbors fully readable. Drag
1:1; month readout ticks at meridian, LIGHT haptic per tick. Release → nearest detent, 280ms
spring (600/28); flicks skip with tick per pass. Deep links spin ≤600ms. TODAY = thin
non-detent gradient card. Reduced-motion: crossfade pager, haptics retained.

## 4 · Per-screen specs

- **Feed.** Wordmark 22/800 + FRIENDS ▾ scope (Friends+ = FoF, public only). Post =
  full-bleed media stub (radius 14, top+bottom scrims): author pill top-left (22px avatar,
  name 12/600 + mono age), bare score top-right, artist 26/800 + caption bottom, ticket
  footer + perforation + notches. Below: ONE mono meta line — `♥ 24 · 6 COMMENTS / 3 WERE
  HERE →`. No action row: double-tap likes, tap opens. Tear-in stagger on first paint.
- **You (wheel).** Pinned header: 48px avatar, name 17/800, mono stat row, white Log pill
  (contextual, never chrome). Deck/Map segmented (200ms crossfade). Compact rows and plans
  are wheel cards too. Map: year sections, month tiles — photo = shared, dot = logged,
  dashed ring = planned; tap spins wheel to card.
- **Log flow.** Tonight card pre-armed from wallet ticket (A6) → details: SEC/ROW/SEAT
  prefilled mono boxes, optional one-liner, `Rank it — 2 quick duels` / ghost save → duel:
  tonight card (fg border + notches) vs history (line border), historical scores hidden until
  chosen (A7), one skip per log → reveal → memory sheet: primary `Save for morning` (draft +
  10:00 nudge, A9), then `Post now` / `Skip`. Log ≠ post.
- **Composer (A22).** THE SHOW + REQUIRED badge: ≥1 show photo/video gates Post. YOU + YOUR
  PEOPLE + OPTIONAL badge: never blocks. Caption → visibility chip → Post → "Right now: 148
  friends can see this."
- **Memory detail.** Full-bleed stub hero (carousel dots), all embedded; mono action line,
  chip strip (SETLIST / VENUE TIPS / artist / venue), who-was-here + joint prompt, comments,
  pinned composer.
- **Explore.** Omnisearch pill → PRESALES THIS WEEK → UPCOMING IN {CITY} (media tiles) →
  TRENDING WITH FRIENDS.
- **Upcoming (A17).** One agenda: THIS WEEK (imminent presale = fg border + live 02:14:09
  countdown) → TICKETED (notched stubs, 41 D) → INTERESTED (dashed).
- **Presale sheet (A16).** Countdown mono 40/800 → code panel (fg border, KDOT26 16/800,
  tap-to-copy, light haptic, green ✓ 1.2s) → `Tickets at Ticketmaster · from $89` → track
  toggle. Zero navigation.
- **Event.** Breadcrumb mono → venue 24/800 + date → stat row (avg/logs/memories) → YOUR
  NIGHT card + stamp → who-went facepile → crowd grid (+N overlay) → setlist `HIDDEN · TAP TO
  REVEAL` → presale code card → tickets primary → parties dashed row.
- **Artist.** Media hero (name embedded 30/800) → Tracking ✓ / Share → YOU × ARTIST (seen /
  your avg / first year) → ON TOUR rows → ALL TOURS with community avgs.
- **Venue.** Title + stat row → Info / Seat views / Tips → seat rows: SEC 112 + ★ 4.6 +
  photo count + thumb → TOP TIP with ▲ upvote block.
- **Wallet.** Ticket stub: TONIGHT eyebrow, artist 22/800, rotated tour stamp, SEC/ROW/SEAT
  boxes → perforation + notches → pure-white barcode (C6) + mono code → `Show mode` /
  `Transfer` → future tickets dashed.
- **Show-mode (C10).** Fixed #050508, battery % in status bar. Artist 15/800 + mono set-start
  line, EXIT pill. Full-bleed viewfinder, REC + zoom chips, `FILES TO TONIGHT'S LOG / NOTHING
  POSTS NOW`. 76px capture ring, shot-count thumb, NOTE, quick actions `Seat view shot`
  (auto-tags section) / `Ticket`.
- **Onboarding (A1–A5).** Welcome (gradient wordmark, `?.?` stub teaser) → Connect (one ask +
  "we read your top artists once") → Radar-live aha (inline city change) → in. Résumé lane
  (catalog-matched recognition cards, scoped A3) and find-friends (post-reveal, A4) never
  gate.
- **Settings & privacy (C9).** Appearance segmented; connected services ✓; dials SAME-SHOW
  DISCOVERY and TASTE MATCH (Off/Friends/Friends+/Everyone) each with a live consequence
  sentence; default visibility chips + sentence; SUMMARY card = exposure in four lines. No
  setting without its sentence.
- **Notifications.** Timed/presale = fg-border urgent; social = card-tone. Pushes lead with
  the payload: code, 8.7, #3 of 47, photo count. Morning-after push at 10:00.
- **Party.** Invite stub (fg border + notches, PRE-PARTY eyebrow, title 21/800, mono
  when/where, host row) → `Going` (primary) / `Maybe` / `Can't` → facepile + counts →
  ANNOUNCEMENTS (pinned first) → dashed invite-matches row.
- **Festival (C12).** FRI/SAT/SUN tabs → stage-grouped rows: mono time · artist 13.5/700 ·
  tag (LIVE SET / B2B / CLOSER); logged sets get mini stamps; ON NOW = fg borders + `Log
  set`. Weekend = ONE wheel stub (`EDC '26 · 9 sets · 8.4 AVG`).
- **Joint post (C13).** `Maya × Jordan` dual-avatar pill; per-photo owner chips (`📷 MAYA'S
  SHOT`); both scores side by side, mono name captions, never averaged; `SEC 112 × SEC 226` +
  `ADMIT 02`; one thread. Invite sheet: "his score stays his, yours stays yours."
- **Social sheets.** Likers (follow state per row) · Who-was-here (respects each person's OWN
  dial, shows vector `VIA FRIENDS+`) · Followers/Following. Rows lead with the shows fact.
- **Badges (C11).** Stamp gallery: COUNTS / LOYALTY · RANGE / CONTRIBUTION · SOCIAL. Earned =
  solid fg stamp + date; locked = dashed stamp + exact distance (`3 TO GO`). No percent
  rings.
- **Wrapped + share cards (C8).** Intro: '26 96/800, stats stub, ADMIT ONE MORE YEAR. Share
  cards 1080×1920, ALWAYS dark-stage, gradient S wordmark; milestone / memory / ranked-list /
  Wrapped layouts per batch 3.
- **States (big five).** Empty = title + one selling sentence + one CTA. Loading = shimmer of
  the real geometry (barcode loads last, full-res). Error = plain language + one retry;
  log-save failure: "Log saved on this phone… will sync itself. Nothing to redo."; barcode
  failure: cached barcode + screenshot advice.

## 5 · Decision log (all signed off)

**Phase A:** A1 aha = import → live radar · A2 city inline · A3 recognition backfill
(scoped: catalog only, no geo v1) · A4 find-friends post-reveal · A5 two lanes · A6
pre-armed Tonight card · A7 duel hides scores, one skip · A8 threshold-only milestones · A9
save-for-morning · A10 resume card · A11 photos→caption→post · A12 exposure at posting · A13
You×Them strip · A14 both-markers · A15 follow reason · A16 one presale sheet · A17 presales
in agenda · A18 ticket→going (scoped: in-app add only) · A19 text on photo · A20 float
(superseded → C7) · A21 de-Instagrammed feed · A22 show media required · A23 motion budget.

**Phase B:** mix = B1 neutrals/hairlines/giant numerals + B2 stub shapes & motion. B3
killed; no acid.

**Phase C:** C1 zero accent · C2 two score bodies · C3 stub = attended only · C4 native
nav · C5 fixed stage (amended by C7) · C6 sacred scanner · C7 wheel, full-opacity
neighbors · C8 gradient on share cards · C9 consequence sentences · C10 show-mode camera,
fixed dark · C11 earned stamps · C12 festival = sets, one stub · C13 joint posts pool media,
never scores.
