// components/wrapped/cards.tsx — the STICKET WRAPPED card deck.
//
// SINGLE-THEME EXCEPTION (deliberate): Wrapped commits to the dark stage in
// BOTH app themes — it is a share/celebration artifact like the log reveal,
// and the captured PNGs must look identical for every user. Every color here
// reads from `darkTokens` directly instead of useTheme().
//
// The brand gradient is SANCTIONED on this surface as a celebratory accent:
// the big-number numeral (static gradient text via MaskedView, same
// treatment as the reveal odometer), thin hairline accents, and the peak
// month bar. Never full gradient backgrounds — the stage stays monochrome.
//
// Every card is designed to be screenshotted: opaque stage background, its
// own "STICKET WRAPPED 'YY" footer, and no interactive chrome (share icon,
// page dots, buttons all live at screen level, OUTSIDE the captured refs).

import React from 'react';
import { Image, StyleSheet, Text, View, type TextStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';

import { darkTokens } from '../../lib/theme';
import { StubPerforation } from '../ui/Stub';
import type { WrappedStats } from './useWrappedData';

// The dark stage, regardless of the app theme (see header note).
const stage = darkTokens;
const c = stage.colors;
const mono = stage.fontFamilies;

export const STAGE_BG = c.bg;

const MONTH_LETTERS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'] as const;

function shortYear(year: number): string {
  return `’${String(year).slice(-2)}`;
}

function formatNightDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();
}

// ─── Shared atoms ──────────────────────────────────────────────────

export function BrandMark({ size = 36 }: { size?: number }) {
  // The brand mark — sanctioned gradient usage.
  return (
    <LinearGradient
      colors={stage.gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
    />
  );
}

/** Thin celebratory accent line — the sanctioned gradient, 2px tall. */
function AccentLine({ width = 56 }: { width?: number }) {
  return (
    <LinearGradient
      colors={stage.gradients.brand}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ width, height: 2, borderRadius: 1 }}
    />
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

/** Static gradient text via MaskedView — the reveal's numeral treatment. */
function GradientNumeral({ text, style }: { text: string; style: TextStyle }) {
  return (
    <MaskedView
      maskElement={
        <Text style={[style, { backgroundColor: 'transparent' }]} allowFontScaling={false}>
          {text}
        </Text>
      }
    >
      {/* Layout ghost sizes the masked content. */}
      <Text style={[style, { opacity: 0 }]} allowFontScaling={false}>
        {text}
      </Text>
      <LinearGradient
        colors={stage.gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </MaskedView>
  );
}

/**
 * Full-bleed page scaffold. `background` renders under everything (best-night
 * photo); the body centers content; every card carries the wordmark footer so
 * a raw screenshot is already attributed.
 */
function CardShell({
  year,
  background,
  children,
}: {
  year: number;
  background?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.shell}>
      {background}
      <View style={styles.body}>{children}</View>
      <View style={styles.footer}>
        <Text style={styles.footerText}>{`STICKET WRAPPED ${shortYear(year)}`}</Text>
      </View>
    </View>
  );
}

// ─── Card 1 · Title — the year, stamped as a stub ──────────────────
// Eyebrow · giant "’26" year mark · a stub-bordered stat strip (2px fg
// border, perforation punching through to the stage bg, mono admit footer).

function StubStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stubStat}>
      <Text style={styles.stubStatValue} numberOfLines={1} allowFontScaling={false}>
        {value}
      </Text>
      <Text style={styles.stubStatLabel}>{label}</Text>
    </View>
  );
}

export function TitleCard({ stats, username }: { stats: WrappedStats; username?: string | null }) {
  return (
    <CardShell year={stats.year}>
      <Eyebrow>STICKET WRAPPED</Eyebrow>
      <View style={{ height: 4 }} />
      <Text style={styles.yearMark} allowFontScaling={false}>
        {shortYear(stats.year)}
      </Text>
      <View style={{ height: 8 }} />
      <Text style={styles.subLine}>Your year, stamped.</Text>
      <View style={{ height: 34 }} />
      <View style={styles.stubStrip}>
        <View style={styles.stubStatsRow}>
          <StubStat
            value={String(stats.totalShows)}
            label={stats.totalShows === 1 ? 'SHOW' : 'SHOWS'}
          />
          <StubStat
            value={String(stats.uniqueArtists)}
            label={stats.uniqueArtists === 1 ? 'ARTIST' : 'ARTISTS'}
          />
          <StubStat
            value={stats.bestNight ? stats.bestNight.score.toFixed(1) : '—'}
            label="BEST"
          />
        </View>
        {/* The tear line — notches punch through the 2px border to the stage. */}
        <StubPerforation notchColor={c.bg} dashColor={c.dash} />
        <View style={styles.stubFooterRow}>
          <Text style={[styles.stubFooterText, { flexShrink: 1 }]} numberOfLines={1}>
            {(username ?? 'STICKET').toUpperCase()}
          </Text>
          <Text style={styles.stubFooterText}>ADMIT ONE MORE YEAR</Text>
        </View>
      </View>
      <View style={{ height: 44 }} />
      <View style={styles.swipeHint}>
        <Ionicons name="chevron-up" size={14} color={c.muteSoft} />
        <Text style={styles.swipeHintText}>SWIPE UP</Text>
      </View>
    </CardShell>
  );
}

// ─── Card 2 · The big number ───────────────────────────────────────

export function BigNumberCard({ stats }: { stats: WrappedStats }) {
  const text = String(stats.totalShows);
  // ~96pt mono numeral; steps down so 3+ digits still fit the stage.
  const fontSize = text.length >= 3 ? 84 : 112;
  return (
    <CardShell year={stats.year}>
      <Eyebrow>YOU WERE THERE</Eyebrow>
      <View style={{ height: 10 }} />
      <GradientNumeral
        text={text}
        style={{
          fontFamily: mono.monoBold,
          fontVariant: ['tabular-nums'],
          fontSize,
          fontWeight: '800',
          letterSpacing: -3,
          color: c.fg,
          textAlign: 'center',
        }}
      />
      <View style={{ height: 6 }} />
      <Text style={styles.bigNumberLabel}>{stats.totalShows === 1 ? 'SHOW' : 'SHOWS'}</Text>
      <View style={{ height: 12 }} />
      <Text style={styles.subLine}>{`in ${stats.year}`}</Text>
    </CardShell>
  );
}

// ─── Card 3 · Top artist ───────────────────────────────────────────

export function TopArtistCard({ stats }: { stats: WrappedStats }) {
  const top = stats.topArtist;
  if (!top) return null;
  const times = top.count === 1 ? 'SEEN ONCE' : `SEEN ${top.count} TIMES`;
  return (
    <CardShell year={stats.year}>
      <Eyebrow>MOST SEEN ARTIST</Eyebrow>
      <View style={{ height: 18 }} />
      <Text style={styles.artistName} numberOfLines={3}>
        {top.name}
      </Text>
      <View style={{ height: 20 }} />
      <View style={styles.monoChip}>
        <Text style={styles.monoChipText}>{times}</Text>
      </View>
      <View style={{ height: 14 }} />
      <Text style={styles.subLine}>
        {`${stats.uniqueArtists} ${stats.uniqueArtists === 1 ? 'artist' : 'artists'} this year`}
      </Text>
    </CardShell>
  );
}

// ─── Card 4 · Best night ───────────────────────────────────────────

export function BestNightCard({ stats }: { stats: WrappedStats }) {
  const night = stats.bestNight;
  if (!night) return null;
  const background = night.photoUrl ? (
    <>
      <Image
        source={{ uri: night.photoUrl }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Heavy scrim — the type must win over any photo. */}
      <LinearGradient
        colors={['rgba(5,5,11,0.45)', 'rgba(5,5,11,0.55)', 'rgba(5,5,11,0.94)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
    </>
  ) : undefined;

  return (
    <CardShell year={stats.year} background={background}>
      <Eyebrow>BEST NIGHT</Eyebrow>
      <View style={{ height: 18 }} />
      <View style={styles.scoreChip}>
        <Text style={styles.scoreChipText}>{night.score.toFixed(1)}</Text>
      </View>
      <View style={{ height: 18 }} />
      <Text style={styles.nightName} numberOfLines={3}>
        {night.eventName}
      </Text>
      <View style={{ height: 12 }} />
      <Text style={styles.nightMeta}>
        {`${formatNightDate(night.date)} · ${night.venueName.toUpperCase()}`}
      </Text>
    </CardShell>
  );
}

// ─── Card 5 · Months strip ─────────────────────────────────────────

const BARS_H = 132;

export function MonthsCard({ stats }: { stats: WrappedStats }) {
  const max = Math.max(...stats.monthCounts, 1);
  // Gradient goes to the single peak month only (ties stay monochrome).
  const peakIndex =
    stats.monthCounts.filter((n) => n === max).length === 1
      ? stats.monthCounts.indexOf(max)
      : -1;

  return (
    <CardShell year={stats.year}>
      <Eyebrow>MONTH BY MONTH</Eyebrow>
      <View style={{ height: 36 }} />
      <View style={styles.barsRow}>
        {stats.monthCounts.map((count, i) => {
          const h = count === 0 ? 4 : Math.round(18 + (count / max) * (BARS_H - 18));
          return (
            <View key={`bar-${i}`} style={styles.barColumn}>
              {i === peakIndex ? (
                <LinearGradient
                  colors={stage.gradients.brand}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[styles.bar, { height: h }]}
                />
              ) : (
                <View
                  style={[
                    styles.bar,
                    { height: h, backgroundColor: count === 0 ? 'rgba(255,255,255,0.14)' : c.fg },
                  ]}
                />
              )}
              <Text style={styles.barLabel}>{MONTH_LETTERS[i]}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ height: 30 }} />
      <Text style={styles.subLine}>
        {`${stats.monthsActive} ${stats.monthsActive === 1 ? 'month' : 'months'} with a show`}
      </Text>
    </CardShell>
  );
}

// ─── Card 6 · Stats grid ───────────────────────────────────────────

function GridCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.gridCell}>
      <Text style={styles.gridValue} numberOfLines={1} allowFontScaling={false}>
        {value}
      </Text>
      <Text style={styles.gridLabel}>{label}</Text>
    </View>
  );
}

export function StatsGridCard({ stats }: { stats: WrappedStats }) {
  return (
    <CardShell year={stats.year}>
      <Eyebrow>THE NUMBERS</Eyebrow>
      <View style={{ height: 26 }} />
      <View style={styles.gridWrap}>
        <View style={styles.gridRow}>
          <GridCell value={String(stats.uniqueVenues)} label={stats.uniqueVenues === 1 ? 'VENUE' : 'VENUES'} />
          <GridCell value={stats.avgScore !== null ? stats.avgScore.toFixed(1) : '—'} label="AVG SCORE" />
        </View>
        <View style={styles.gridRow}>
          <GridCell value={String(stats.totalPhotos)} label={stats.totalPhotos === 1 ? 'PHOTO' : 'PHOTOS'} />
          <GridCell value={String(stats.longestStreak)} label="MONTH STREAK" />
        </View>
      </View>
      {stats.topVenue && stats.topVenue.count >= 2 ? (
        <>
          <View style={{ height: 22 }} />
          <Text style={styles.subLineMono} numberOfLines={1}>
            {`HOME VENUE — ${stats.topVenue.name.toUpperCase()} × ${stats.topVenue.count}`}
          </Text>
        </>
      ) : null}
    </CardShell>
  );
}

// ─── Card 7 · Closing / share ──────────────────────────────────────
// The share BUTTON is screen chrome (app/wrapped/index.tsx) so the captured
// PNG of this card stays clean — this card is the year-summary artifact.

export function ClosingCard({ stats }: { stats: WrappedStats }) {
  return (
    <CardShell year={stats.year}>
      <BrandMark size={40} />
      <View style={{ height: 26 }} />
      <Text style={styles.closingTitle}>Share your year</Text>
      <View style={{ height: 16 }} />
      <Text style={styles.subLineMono}>
        {`${stats.totalShows} ${stats.totalShows === 1 ? 'SHOW' : 'SHOWS'} · ${stats.uniqueArtists} ${
          stats.uniqueArtists === 1 ? 'ARTIST' : 'ARTISTS'
        } · ${stats.uniqueVenues} ${stats.uniqueVenues === 1 ? 'VENUE' : 'VENUES'}`}
      </Text>
      <View style={{ height: 22 }} />
      <AccentLine />
      <View style={{ height: 22 }} />
      <Text style={styles.subLine}>sticket.in</Text>
    </CardShell>
  );
}

// ─── Styles (stage-fixed — see single-theme note) ──────────────────

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: c.bg, // opaque — captures never show through
    overflow: 'hidden',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 72,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 54,
  },
  footerText: {
    fontFamily: mono.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    color: c.muteSoft,
  },
  eyebrow: {
    fontFamily: mono.monoSemi,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: c.mute,
    textAlign: 'center',
  },
  yearMark: {
    fontSize: 96,
    lineHeight: 104,
    fontWeight: '800',
    letterSpacing: -4,
    color: c.fg,
    textAlign: 'center',
  },
  // The stub-bordered stat strip — 2px fg border; overflow hidden clips the
  // perforation punches into semicircle notches on the border itself.
  stubStrip: {
    alignSelf: 'stretch',
    borderWidth: 2,
    borderColor: c.fg,
    borderRadius: stage.radius.stub,
    overflow: 'hidden',
  },
  stubStatsRow: {
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  stubStat: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stubStatValue: {
    fontVariant: ['tabular-nums'],
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: c.fg,
  },
  stubStatLabel: {
    fontFamily: mono.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: c.muteSoft,
  },
  stubFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  stubFooterText: {
    fontFamily: mono.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: c.muteSoft,
  },
  swipeHint: {
    alignItems: 'center',
    gap: 4,
  },
  swipeHintText: {
    fontFamily: mono.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: c.muteSoft,
  },
  bigNumberLabel: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    color: c.fg,
    textAlign: 'center',
  },
  subLine: {
    fontSize: 14,
    fontWeight: '400',
    color: c.mute,
    textAlign: 'center',
  },
  subLineMono: {
    fontFamily: mono.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: c.mute,
    textAlign: 'center',
  },
  artistName: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: c.fg,
    textAlign: 'center',
  },
  monoChip: {
    backgroundColor: c.card2,
    borderWidth: 1,
    borderColor: c.hairline,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 30,
    justifyContent: 'center',
  },
  monoChipText: {
    fontFamily: mono.monoSemi,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: c.text,
  },
  scoreChip: {
    backgroundColor: c.inverseBg,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 34,
    justifyContent: 'center',
  },
  scoreChipText: {
    fontFamily: mono.monoBold,
    fontVariant: ['tabular-nums'],
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: c.inverseFg,
  },
  nightName: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: c.fg,
    textAlign: 'center',
  },
  nightMeta: {
    fontFamily: mono.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: c.textSoft,
    textAlign: 'center',
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bar: {
    width: '100%',
    maxWidth: 16,
    borderRadius: 3,
  },
  barLabel: {
    fontFamily: mono.mono,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: c.muteSoft,
  },
  gridWrap: {
    alignSelf: 'stretch',
    gap: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gridCell: {
    flex: 1,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.hairline,
    borderRadius: stage.radius.lg,
    paddingVertical: 22,
    alignItems: 'center',
    gap: 8,
  },
  gridValue: {
    fontFamily: mono.monoBold,
    fontVariant: ['tabular-nums'],
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    color: c.fg,
  },
  gridLabel: {
    fontFamily: mono.mono,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: c.mute,
  },
  closingTitle: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: c.fg,
    textAlign: 'center',
  },
});
