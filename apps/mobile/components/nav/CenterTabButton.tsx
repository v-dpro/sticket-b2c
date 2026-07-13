// CenterTabButton — a CONCERT TICKET sticking out of the tab bar, bigger
// than its neighbors, idly bobbing. TAP: it nudges up and the wheel spins
// home to today. PULL IT UP past the threshold (it buzzes) and release —
// the log flow pops. Any release drops the ticket straight back down.

import React, { useCallback, useRef } from 'react';
import { Pressable, View } from 'react-native';
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

// Pulling past this fires the log on release (buzz on crossing).
const PULL_TRIGGER = 52;
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
  }));

  const openLog = useCallback(() => {
    haptics.medium();
    // Straight back down — the ticket never lingers up.
    pull.value = withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) });
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
          pull.value = Math.max(0, Math.min(dy, PULL_TRIGGER + 26));
          const nowArmed = dy >= PULL_TRIGGER;
          if (nowArmed !== armedRef.current) {
            armedRef.current = nowArmed;
            if (nowArmed) haptics.medium();
          }
        }}
        onPressOut={() => {
          if (armedRef.current) {
            openLog();
          } else if (dragging.current) {
            pull.value = withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) });
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
