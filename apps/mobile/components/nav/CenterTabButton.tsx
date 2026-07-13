// CenterTabButton — a CONCERT TICKET sticking out of the tab bar, bigger
// than its neighbors, idly bobbing. TAP: it nudges up and the wheel spins
// home to today. PULL IT UP: a "+" extends out of the ticket — drag your
// finger ONTO the + (it buzzes when you land) and release to log.

import React, { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { emitSnapToToday } from '../../lib/navigation/timelineBus';
import { haptics, springs } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

// The + LANDING ZONE: logging arms only while the finger is actually ON
// the revealed + button (this pull-distance band), buzzes on arrival,
// and fires on release. Overshooting past the band disarms — a wild
// flick can't trigger the log.
const ARM_MIN = 56;
const ARM_MAX = 118;
// The + fades fully in well before the finger arrives.
const PLUS_IN = 40;
// Ticket geometry — deliberately bigger than the 26px neighbor icons.
// WIDE stub with a SHORT tip riding proud of the bar's top edge (LIFT),
// and a tiny up-arrow telling you it pulls.
const TICKET_W = 76;
const TICKET_H = 88;
const PEEK = 40;
// How far the whole pocket rides above the bar at rest — the ticket
// visibly pops OUT of the nav bar box.
const LIFT = 12;
// The pull only ever draws the ticket out THIS much — it's a tease, not
// an extraction; the finger travels on, up to the + itself.
const PULL_REVEAL = 26;

type CenterTabButtonProps = {
  onPress?: (e?: unknown) => void;
  accessibilityState?: { selected?: boolean };
};

export function CenterTabButton({ onPress, accessibilityState }: CenterTabButtonProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  void accessibilityState;

  // pull: finger's upward travel in px; the ticket teases out, the + lands.
  const pull = useSharedValue(0);
  // Idle bob — the ticket breathes up and down so the pull is discoverable.
  const bob = useSharedValue(0);
  const armedRef = useRef(false);
  const startY = useRef(0);
  const dragging = useRef(false);

  React.useEffect(() => {
    bob.value = withRepeat(
      withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [bob]);

  // The pull and the bob GROW THE POCKET, not translate the ticket: the
  // ticket stays top-anchored inside the clipped pocket, so its top edge
  // rides the pocket's rising rim — it emerges from the bar instead of
  // sliding past a fixed clip window.
  const pocketStyle = useAnimatedStyle(() => ({
    height:
      PEEK + Math.min(pull.value, PULL_REVEAL) + (pull.value > 2 ? 0 : bob.value * 7),
    // Proud of the bar at rest — transform moves the clip window with it.
    transform: [{ translateY: -LIFT }],
  }));

  // The + grows out of the ticket as the pull deepens.
  const plusStyle = useAnimatedStyle(() => {
    const p = Math.min(pull.value / PLUS_IN, 1);
    const onIt = pull.value >= ARM_MIN && pull.value <= ARM_MAX;
    return {
      opacity: p,
      transform: [
        { translateY: -LIFT - Math.min(pull.value, PULL_REVEAL) - 10 },
        // Swells while the finger is on it — the release target is live.
        { scale: (0.5 + p * 0.5) * (onIt ? 1.18 : 1) },
      ],
    };
  });

  const styles = useThemedStyles((t) => ({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      overflow: 'visible',
    },
    pocket: {
      width: TICKET_W,
      // Clip the ticket's lower half — only the stub peeks above the bar.
      // Height is animated (PEEK + pull + bob) via pocketStyle.
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    ticket: {
      width: TICKET_W,
      height: TICKET_H,
      borderTopLeftRadius: 12,
      borderTopRightRadius: 12,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
      backgroundColor: t.colors.inverseBg,
      alignItems: 'center',
      paddingTop: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 7,
      elevation: 8,
    },
    perf: {
      position: 'absolute',
      top: 19,
      left: 6,
      right: 6,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.inverseFg,
      opacity: 0.35,
    },
    notchL: {
      position: 'absolute',
      top: 14,
      left: -5,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.colors.bg,
    },
    notchR: {
      position: 'absolute',
      top: 14,
      right: -5,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.colors.bg,
    },
    plus: {
      position: 'absolute',
      top: -40,
      alignSelf: 'center',
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.inverseBg,
      borderWidth: 2,
      borderColor: t.colors.bg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 10,
    },
  }));

  const openLog = useCallback(() => {
    haptics.medium();
    pull.value = withSpring(0, springs.press);
    armedRef.current = false;
    router.push('/log/search');
  }, [pull, router]);

  const tapTicket = useCallback(() => {
    pull.value = withSequence(withTiming(9, { duration: 100 }), withSpring(0, springs.press));
    haptics.light();
    onPress?.();
    // The timeline also snaps on focus; this covers the already-there tap.
    setTimeout(() => emitSnapToToday(), 80);
  }, [pull, onPress]);

  return (
    <View style={styles.wrap}>
      {/* The + that extends from the ticket while pulling. */}
      <Animated.View style={[styles.plus, plusStyle]} pointerEvents="none">
        <Ionicons name="add" size={24} color={tokens.colors.inverseFg} />
      </Animated.View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Timeline — jump to today. Pull up to log a show."
        onPressIn={(e) => {
          startY.current = e.nativeEvent.pageY;
          dragging.current = false;
        }}
        onTouchMove={(e) => {
          const dy = startY.current - e.nativeEvent.pageY;
          if (dy > 6) dragging.current = true;
          const clamped = Math.max(0, Math.min(dy, ARM_MAX + 30));
          pull.value = clamped;
          // Armed ONLY while the finger sits on the + — buzz on arrival.
          const nowArmed = clamped >= ARM_MIN && clamped <= ARM_MAX;
          if (nowArmed !== armedRef.current) {
            armedRef.current = nowArmed;
            if (nowArmed) haptics.medium();
          }
        }}
        onPressOut={() => {
          if (armedRef.current) {
            openLog();
          } else if (dragging.current) {
            pull.value = withSpring(0, springs.press);
          }
          dragging.current = false;
        }}
        onPress={() => {
          if (!dragging.current && !armedRef.current) tapTicket();
        }}
        hitSlop={{ top: 12, bottom: 8, left: 14, right: 14 }}
      >
        <Animated.View style={[styles.pocket, pocketStyle]}>
          <View style={styles.ticket}>
            <View style={styles.perf} />
            <View style={styles.notchL} />
            <View style={styles.notchR} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
