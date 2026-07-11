// WhoWasHere — expandable attendees block (SCREENS.md §1.6).
// Collapsed: mono summary line + count. Tap expands with auto-height
// layout animation (300ms) and 40ms stagger-fade per row
// (INTERACTIONS.md "Who was here expand"). Rows: avatar + name +
// rating + Follow CTA.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  FadeInDown,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { getLogDetail } from '../../lib/api/feed';
import { followUser } from '../../lib/api/profile';
import { colors, fontFamilies, radius } from '../../lib/theme';
import { haptics, motionDurations } from '../../lib/motion';
import { Avatar } from '../ui/Avatar';
import { RatingStars } from '../ui/RatingStars';
import { SpringPressable } from '../ui/SpringPressable';

type Attendee = {
  id: string;
  username: string;
  avatarUrl?: string;
  rating?: number;
  tagged?: boolean;
};

// Module-level cache so collapsing/scroll-recycling doesn't refetch.
const attendeeCache = new Map<string, Attendee[]>();

/** Call on explicit pull-to-refresh so attendee lists refetch. */
export function invalidateWhoWasHereCache() {
  attendeeCache.clear();
}

interface WhoWasHereProps {
  logId: string;
  wasThereCount: number;
  /** Viewer id — hides Follow CTA on self. */
  currentUserId?: string;
}

function FollowButton({ userId }: { userId: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'following'>('idle');

  const handleFollow = useCallback(async () => {
    if (state !== 'idle') return;
    setState('busy');
    try {
      await followUser(userId);
      setState('following');
      haptics.light();
    } catch {
      setState('idle');
      haptics.error();
    }
  }, [state, userId]);

  if (state === 'following') {
    return (
      <View style={[styles.followBtn, styles.followingBtn]}>
        <Text style={styles.followingText}>FOLLOWING</Text>
      </View>
    );
  }

  return (
    <SpringPressable
      onPress={handleFollow}
      style={styles.followBtn}
      accessibilityRole="button"
      accessibilityLabel="Follow"
    >
      {state === 'busy' ? (
        <ActivityIndicator size="small" color={colors.brandCyan} />
      ) : (
        <Text style={styles.followText}>FOLLOW</Text>
      )}
    </SpringPressable>
  );
}

export function WhoWasHere({ logId, wasThereCount, currentUserId }: WhoWasHereProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[] | null>(attendeeCache.get(logId) ?? null);
  const [error, setError] = useState(false);

  const chevron = useSharedValue(0);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevron.value * 180}deg` }],
  }));

  const loadAttendees = useCallback(async () => {
    if (attendeeCache.has(logId)) {
      setAttendees(attendeeCache.get(logId)!);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const detail = await getLogDetail(logId);
      const seen = new Set<string>();
      const rows: Attendee[] = [];
      for (const t of detail.log.taggedFriends ?? []) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        rows.push({ id: t.id, username: t.username, avatarUrl: t.avatarUrl, tagged: true });
      }
      for (const o of detail.othersWhoWent ?? []) {
        if (seen.has(o.id)) continue;
        seen.add(o.id);
        rows.push({ id: o.id, username: o.username, avatarUrl: o.avatarUrl, rating: o.rating });
      }
      attendeeCache.set(logId, rows);
      setAttendees(rows);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [logId]);

  const toggle = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    chevron.value = withTiming(next ? 1 : 0, {
      duration: motionDurations.expand,
      easing: Easing.out(Easing.ease),
    });
    haptics.light();
    if (next && !attendees) void loadAttendees();
  }, [attendees, chevron, expanded, loadAttendees]);

  const summary =
    wasThereCount > 0
      ? `${wasThereCount} ALSO WENT`
      : 'SEE WHO ELSE WENT';

  return (
    <Animated.View layout={LinearTransition.duration(motionDurations.expand)} style={styles.block}>
      <Pressable
        onPress={toggle}
        style={styles.headerRow}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`Who was here. ${summary.toLowerCase()}`}
      >
        <Text style={styles.eyebrow}>who was here</Text>
        <Text style={styles.summary}>{summary}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons name="chevron-down" size={14} color={colors.textLo} />
        </Animated.View>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {loading ? (
            <Animated.View entering={FadeInDown.duration(180)} style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.brandCyan} />
            </Animated.View>
          ) : error ? (
            <Animated.View entering={FadeInDown.duration(180)}>
              <Pressable onPress={loadAttendees} accessibilityRole="button">
                <Text style={styles.emptyText}>couldn&rsquo;t load — tap to retry</Text>
              </Pressable>
            </Animated.View>
          ) : attendees && attendees.length > 0 ? (
            attendees.map((a, i) => (
              <Animated.View
                key={a.id}
                entering={FadeInDown.delay(i * motionDurations.rowStagger).duration(220)}
              >
                <Pressable
                  onPress={() => router.push({ pathname: '/profile/[id]', params: { id: a.id } })}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${a.username}'s profile`}
                >
                  <Avatar uri={a.avatarUrl} name={a.username} size={32} />
                  <View style={styles.rowInfo}>
                    <Text style={styles.rowName} numberOfLines={1}>
                      @{a.username}
                    </Text>
                    {a.tagged ? (
                      <Text style={styles.rowMeta}>TAGGED</Text>
                    ) : a.rating ? (
                      <RatingStars rating={a.rating} size={9} animated={false} gap={1} />
                    ) : (
                      <Text style={styles.rowMeta}>WENT TOO</Text>
                    )}
                  </View>
                  {currentUserId && a.id !== currentUserId ? <FollowButton userId={a.id} /> : null}
                </Pressable>
              </Animated.View>
            ))
          ) : (
            <Animated.View entering={FadeInDown.duration(180)}>
              <Text style={styles.emptyText}>no friends here yet.</Text>
            </Animated.View>
          )}
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  eyebrow: {
    flex: 1,
    fontFamily: fontFamilies.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.textMid,
  },
  summary: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.brandCyan,
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    gap: 10,
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: fontFamilies.uiSemi,
    fontSize: 13,
    color: colors.textHi,
  },
  rowMeta: {
    fontFamily: fontFamilies.mono,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textLo,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
    paddingVertical: 8,
  },
  followBtn: {
    height: 26,
    paddingHorizontal: 12,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.35)',
    backgroundColor: 'rgba(0,212,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  followText: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.brandCyan,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderColor: colors.hairline,
  },
  followingText: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.textLo,
  },
});
