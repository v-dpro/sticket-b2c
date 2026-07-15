// Plan · WITH FRIENDS — the overlap radar: your planned nights (ticketed or
// circling) where friends are on it too. The lightweight coordination lane —
// no hosting ceremony, just "you + 2 friends are eyeing this" → tap into THE
// NIGHT and rally them from there. Client-composed: the timeline's upcoming
// plans + each event's friend facepiles (GET /events/:id, capped + parallel).
// Renders nothing when no overlap exists — silence beats an empty section.

import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import { useSession } from '../../hooks/useSession';
import { getEvent } from '../../lib/api/events';
import { getUserTimeline } from '../../lib/api/timeline';
import type { ExplorePerson } from '../../lib/api/explore';
import { durations, tearIn } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { SpringPressable } from '../ui/SpringPressable';

// How many upcoming plans we probe for overlap per load.
const PROBE_LIMIT = 8;

type OverlapRow = {
  eventId: string;
  eventName: string;
  date: string;
  venueName: string;
  friends: ExplorePerson[];
  /** Whether the viewer holds a ticket (vs. just circling). */
  ticketed: boolean;
};

function monoDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}

export function FriendOverlapSection() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { user } = useSession();

  const [rows, setRows] = useState<OverlapRow[]>([]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const timeline = await getUserTimeline(user.id, { limit: 1 });
      const now = Date.now();
      const plans = (timeline.upcoming ?? [])
        .filter(
          (u) =>
            (u.type === 'ticket' || u.type === 'interested') &&
            new Date(u.date).getTime() >= now - 86400000,
        )
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, PROBE_LIMIT);

      const details = await Promise.allSettled(plans.map((p) => getEvent(p.event.id)));
      const overlaps: OverlapRow[] = [];
      details.forEach((res, i) => {
        if (res.status !== 'fulfilled') return;
        const plan = plans[i]!;
        const friends = (res.value.friendsInterested ?? []).map((f) => ({
          id: f.id,
          username: f.username,
          displayName: f.displayName,
          avatarUrl: f.avatarUrl,
          degree: f.degree,
        }));
        if (friends.length === 0) return;
        overlaps.push({
          eventId: plan.event.id,
          eventName: plan.event.name,
          date: plan.date,
          venueName: plan.event.venue.name,
          friends,
          ticketed: plan.type === 'ticket',
        });
      });
      setRows(overlaps);
    } catch {
      // Overlap is a bonus lane — failures stay silent.
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

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
    row: {
      marginHorizontal: t.density.pad,
      marginBottom: 8,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    body: { flex: 1, minWidth: 0, gap: 3 },
    name: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    signal: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.fg,
      marginTop: 2,
    },
  }));

  if (rows.length === 0) return null;

  return (
    <View>
      <Text style={styles.section}>With friends</Text>
      {rows.map((row, i) => (
        <Animated.View key={row.eventId} entering={tearIn(Math.min(i, 8) * durations.stagger)}>
          <SpringPressable
            haptic="light"
            onPress={() => router.push(`/night/${row.eventId}`)}
            accessibilityRole="button"
            accessibilityLabel={`${row.eventName} — ${row.friends.length} friends also on this night`}
            style={styles.row}
          >
            <DegreeFacepile
              people={row.friends}
              totalCount={row.friends.length}
              size={26}
              max={3}
              surfaceColor={tokens.colors.card}
            />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {row.eventName}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[row.venueName, monoDate(row.date)].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.signal} numberOfLines={1}>
                {row.friends.length} FRIEND{row.friends.length === 1 ? '' : 'S'}{' '}
                {row.ticketed ? 'ON THIS NIGHT' : 'ALSO EYEING'}
              </Text>
            </View>
          </SpringPressable>
        </Animated.View>
      ))}
    </View>
  );
}
