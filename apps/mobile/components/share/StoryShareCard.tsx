// StoryShareCard — the IG-story export of a single memory (1080×1920).
// A BRAND ARTIFACT like the other share cards: always dark-stage, fixed
// SHARE_DARK palette, ink only — regardless of app theme. Rendered
// offscreen at 360×640 and captured at 1080×1920 (lib/share/instagram).
//
// Construction: the memory's hero photo full-bleed under a scrim that runs
// to near-ink at the bottom — where the ticket-stub block floats inset, so
// the perforation notches punch through to true stage bg (the stub language,
// C3). Artist big + bare score digits beside it, venue · date in ticket
// mono, then the sign-off row: poster's handle and the small sticket
// wordmark. Nothing critical sits in the top/bottom ~13% (IG chrome).

import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { BareScore, StripeField, StubDetailsRow, StubPerforation } from '../ui/Stub';
import { SHARE_DARK, ShareMono } from './ShareCardShell';

/** Offscreen render size — captured at 3× for a 1080×1920 story PNG. */
export const STORY_CARD_WIDTH = 360;
export const STORY_CARD_HEIGHT = 640;

/** The narrow slice of the log payload the story card needs. */
export type StoryShareData = {
  artistName: string;
  venueName: string;
  venueCity?: string;
  /** ISO event date. */
  date: string;
  /** Log score — omit when unscored (no zero-as-score). */
  score?: number;
  /** Hero image URI (memory photo, or artist art upstream). */
  photo?: string;
  /** Poster's handle, without the @. */
  username: string;
};

type StoryShareCardProps = {
  data: StoryShareData;
  /** Fires once the hero photo loads (or errors, or is absent) — the
      capture flow gates on this so the snapshot never catches a blank hero. */
  onHeroReady?: () => void;
};

/** ISO date → "JUL 11 2026" (always with year — exports outlive the year). */
function storyDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .replace(',', '')
    .toUpperCase();
}

export function StoryShareCard({ data, onHeroReady }: StoryShareCardProps) {
  // No photo → nothing to wait for; unblock the capture gate immediately.
  useEffect(() => {
    if (!data.photo) onHeroReady?.();
  }, [data.photo, onHeroReady]);

  const venueLine = [data.venueName, data.venueCity].filter(Boolean).join(', ');

  return (
    <View style={styles.canvas}>
      {data.photo ? (
        <Image
          source={{ uri: data.photo }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          // No fade — a capture mid-transition would bake in a half-faded hero.
          transition={0}
          cachePolicy="memory-disk"
          onLoad={onHeroReady}
          onError={onHeroReady}
        />
      ) : (
        // Photo-less memory: ticket-stock stripes on the dark stage.
        <StripeField color="rgba(255,255,255,0.04)" />
      )}

      {/* Scrim settles to near-ink behind the stub block, so its punched
          notches (painted SHARE_DARK.bg) read as true holes. */}
      <LinearGradient
        colors={['rgba(11,11,16,0.35)', 'rgba(11,11,16,0.10)', 'rgba(11,11,16,0.97)']}
        locations={[0, 0.45, 0.8]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <View style={styles.stubHost}>
        <View style={styles.stubCard}>
          <View style={styles.stubTop}>
            <View style={styles.titleRow}>
              <Text style={styles.artist} numberOfLines={2}>
                {data.artistName}
              </Text>
              {typeof data.score === 'number' ? <BareScore score={data.score} size={40} /> : null}
            </View>
            <StubDetailsRow left={venueLine} right={storyDate(data.date)} onMedia style={styles.detailsRow} />
          </View>

          <StubPerforation notchColor={SHARE_DARK.bg} dashColor={SHARE_DARK.dash} />

          <View style={styles.signOff}>
            <ShareMono color={SHARE_DARK.mute}>@{data.username}</ShareMono>
            <Text style={styles.wordmark}>sticket</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// Fixed dark-artifact palette — deliberately NOT useThemedStyles.
const styles = StyleSheet.create({
  canvas: {
    width: STORY_CARD_WIDTH,
    height: STORY_CARD_HEIGHT,
    backgroundColor: SHARE_DARK.bg,
    overflow: 'hidden',
  },
  // Inset + bottom margin keep the stub clear of IG's reply bar (~13%).
  stubHost: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 84,
  },
  stubCard: {
    borderRadius: 14, // radius.stub
    backgroundColor: SHARE_DARK.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: SHARE_DARK.line,
    overflow: 'hidden', // clips the notch punches to half-circles at the edges
  },
  stubTop: {
    padding: 18,
    paddingBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  artist: {
    flex: 1,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 33,
    color: SHARE_DARK.fg,
  },
  detailsRow: {
    marginTop: 12,
  },
  signOff: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 14,
  },
  wordmark: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
    color: SHARE_DARK.fg,
  },
});
