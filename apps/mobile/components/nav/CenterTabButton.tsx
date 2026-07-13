// CenterTabButton — a CONCERT TICKET sticking out of the tab bar, bigger
// than its neighbors, idly bobbing. TAP: it nudges up and the wheel spins
// home to today. PULL IT UP: a small "+" extends out of the ticket — keep
// pulling (or release past the threshold) and the log flow opens.

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

// The pull distance that commits to logging.
const PULL_TRIGGER = 44;
// Ticket geometry — deliberately bigger than the 26px neighbor icons.
// WIDE stub, SHORT tip: it reads as a ticket slotted into the bar, with
// a tiny up-arrow telling you it pulls.
const TICKET_W = 72;
const TICKET_H = 84;
const PEEK = 42;

type CenterTabButtonProps = {
  onPress?: (e?: unknown) => void;
  accessibilityState?: { selected?: boolean };
};

export function CenterTabButton({ onPress, accessibilityState }: CenterTabButtonProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  void accessibilityState;

  // pull: 0 at rest → PULL_TRIGGER when armed. Ticket follows the finger.
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
    height: PEEK + pull.value + (pull.value > 2 ? 0 : bob.value * 6),
  }));

  // The + grows out of the ticket as the pull deepens.
  const plusStyle = useAnimatedStyle(() => {
    const p = Math.min(pull.value / PULL_TRIGGER, 1);
    return {
      opacity: p,
      transform: [{ translateY: -pull.value - 6 }, { scale: 0.5 + p * 0.5 }],
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
      width: TICKET_W + 14,
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
    pullHint: { opacity: 0.55 },
    perf: {
      position: 'absolute',
      top: 30,
      left: 6,
      right: 6,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.inverseFg,
      opacity: 0.35,
    },
    // Side notches on the perforation — it reads TICKET at a glance.
    notchL: {
      position: 'absolute',
      top: 25,
      left: -5,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.colors.bg,
    },
    notchR: {
      position: 'absolute',
      top: 25,
      right: -5,
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: t.colors.bg,
    },
    plus: {
      position: 'absolute',
      top: -34,
      alignSelf: 'center',
      width: 34,
      height: 34,
      borderRadius: 17,
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
        <Ionicons name="add" size={20} color={tokens.colors.inverseFg} />
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
          const clamped = Math.max(0, Math.min(dy, PULL_TRIGGER + 18));
          pull.value = clamped;
          const nowArmed = clamped >= PULL_TRIGGER;
          if (nowArmed !== armedRef.current) {
            armedRef.current = nowArmed;
            if (nowArmed) haptics.light();
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
            <Ionicons
              name="chevron-up"
              size={13}
              color={tokens.colors.inverseFg}
              style={styles.pullHint}
            />
            <View style={styles.perf} />
            <View style={styles.notchL} />
            <View style={styles.notchR} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}
