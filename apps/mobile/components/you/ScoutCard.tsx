// ScoutCard — the SCOUT ladder on the You page: the second reputation
// track, earned by intel (tips, seat views, answers), not attendance.
// Mirrors the CollectorScorecard's ticket-stub language: rank + filling
// perforation to the next standing, three tallies, and the prosocial
// line — "YOUR INTEL HELPED N PLANNERS". Renders a one-line nudge until
// the first contribution exists; self-fetching and non-blocking.

import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { getMyScout } from '../../lib/api/scout';
import { scoutRank, type ScoutCounts } from '../../lib/gamification';
import { useThemedStyles } from '../../lib/theme-context';

export function ScoutCard() {
  const [counts, setCounts] = useState<ScoutCounts | null>(null);

  useEffect(() => {
    let alive = true;
    getMyScout()
      .then((c) => {
        if (alive) setCounts(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const styles = useThemedStyles((t) => ({
    section: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
      paddingHorizontal: t.density.pad,
      marginTop: 24,
      marginBottom: 10,
    },
    card: {
      marginHorizontal: t.density.pad,
      padding: 16,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      gap: 12,
    },
    rankRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    rankName: { fontSize: 20, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    rankPts: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    // The progress bar is a perforation that fills (CollectorScorecard's move).
    barTrack: {
      height: 5,
      borderRadius: 999,
      backgroundColor: t.colors.card2,
      overflow: 'hidden',
    },
    barFill: { height: 5, borderRadius: 999, backgroundColor: t.colors.fg },
    helped: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.fg,
    },
    tallies: { flexDirection: 'row', gap: 18 },
    tally: { gap: 2 },
    tallyNum: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 17,
      fontWeight: '700',
      color: t.colors.fg,
    },
    tallyKey: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9.5,
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    nudge: { fontSize: 13.5, lineHeight: 19, color: t.colors.mute },
  }));

  if (!counts) return null;

  const rank = scoutRank(counts);
  const hasAny = counts.tips + counts.seatViews + counts.answers > 0;

  return (
    <View>
      <Text style={styles.section}>Scout</Text>
      <View style={styles.card}>
        {hasAny ? (
          <>
            <View style={styles.rankRow}>
              <Text style={styles.rankName}>{rank.name}</Text>
              <Text style={styles.rankPts}>
                {rank.nextAt !== null ? `${rank.points} / ${rank.nextAt} PTS` : `${rank.points} PTS`}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(rank.progress * 100)}%` }]} />
            </View>
            {rank.helped > 0 ? (
              <Text style={styles.helped}>
                YOUR INTEL HELPED {rank.helped} PLANNER{rank.helped === 1 ? '' : 'S'}
              </Text>
            ) : null}
            <View style={styles.tallies}>
              <View style={styles.tally}>
                <Text style={styles.tallyNum}>{counts.tips}</Text>
                <Text style={styles.tallyKey}>TIPS</Text>
              </View>
              <View style={styles.tally}>
                <Text style={styles.tallyNum}>{counts.seatViews}</Text>
                <Text style={styles.tallyKey}>SEAT VIEWS</Text>
              </View>
              <View style={styles.tally}>
                <Text style={styles.tallyNum}>{counts.answers}</Text>
                <Text style={styles.tallyKey}>ANSWERS</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.nudge}>
            Drop a venue tip or a seat view after your next show — intel earns Scout rank, and it
            shows up where people plan their nights.
          </Text>
        )}
      </View>
    </View>
  );
}
