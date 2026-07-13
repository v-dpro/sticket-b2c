// CenterTabButton — a HALF TICKET peeking out of the tab bar, like a stub
// in a shirt pocket. TAP: the ticket nudges upward and the wheel spins home
// to today. HOLD: the "+ Log" pill pops above it (medium haptic) — tap the
// pill or slide up and release to start logging. A tiny "HOLD ↑" whisper
// floats above so the gesture is discoverable.

import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { emitSnapToToday } from '../../lib/navigation/timelineBus';
import { haptics, springs } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

const HOLD_MS = 380;
const SLIDE_TRIGGER = 48;
// The ticket: a portrait stub whose bottom half hides inside the tab bar.
const TICKET_W = 46;
const TICKET_H = 64;
const PEEK = 36; // visible height above the clip

type CenterTabButtonProps = {
  /** The tab's own navigation press (opens Timeline). */
  onPress?: (e?: unknown) => void;
  accessibilityState?: { selected?: boolean };
};

export function CenterTabButton({ onPress, accessibilityState }: CenterTabButtonProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const focused = accessibilityState?.selected ?? false;
  void focused;

  const [popup, setPopup] = useState(false);
  const [slideArmed, setSlideArmed] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActive = useRef(false);
  const startY = useRef(0);
  const armed = useRef(false);

  // The tap nudge — the ticket pops up a little and settles back.
  const nudge = useSharedValue(0);
  const nudgeStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: nudge.value }],
  }));

  const styles = useThemedStyles((t) => ({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
      overflow: 'visible',
    },
    hint: {
      position: 'absolute',
      top: -18,
      alignSelf: 'center',
      fontFamily: t.fontFamilies.mono,
      fontSize: 8,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    // The pocket — clips the ticket's lower half.
    pocket: {
      width: TICKET_W + 12,
      height: PEEK,
      overflow: 'hidden',
      alignItems: 'center',
    },
    ticket: {
      width: TICKET_W,
      height: TICKET_H,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      borderBottomLeftRadius: 6,
      borderBottomRightRadius: 6,
      backgroundColor: t.colors.inverseBg,
      alignItems: 'center',
      paddingTop: 7,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 8,
    },
    // The stub perforation — a dashed tear across the ticket.
    perf: {
      position: 'absolute',
      top: 26,
      left: 5,
      right: 5,
      borderBottomWidth: 1,
      borderStyle: 'dashed',
      borderColor: t.colors.inverseFg,
      opacity: 0.35,
    },
    backdrop: { flex: 1 },
    logPill: {
      position: 'absolute',
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 13,
      paddingHorizontal: 26,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.inverseBg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 18,
      elevation: 12,
    },
    logPillText: { fontSize: 16, fontWeight: '800', color: t.colors.inverseFg },
  }));

  const openLog = useCallback(() => {
    setPopup(false);
    setSlideArmed(false);
    haptics.medium();
    router.push('/log/search');
  }, [router]);

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const tapTicket = useCallback(() => {
    // Nudge up, settle back — and the wheel spins home to today.
    nudge.value = withSequence(withTiming(-7, { duration: 110 }), withSpring(0, springs.press));
    onPress?.();
    // Let the tab switch land, then snap (also fires when already there).
    setTimeout(() => emitSnapToToday(), 80);
  }, [nudge, onPress]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>HOLD ↑</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Timeline — jump to today. Hold to log a show."
        onPressIn={(e) => {
          holdActive.current = false;
          armed.current = false;
          startY.current = e.nativeEvent.pageY;
          clearHold();
          holdTimer.current = setTimeout(() => {
            holdActive.current = true;
            haptics.medium();
            setPopup(true);
          }, HOLD_MS);
        }}
        onTouchMove={(e) => {
          if (!holdActive.current) return;
          const dy = startY.current - e.nativeEvent.pageY;
          const nowArmed = dy > SLIDE_TRIGGER;
          if (nowArmed !== armed.current) {
            armed.current = nowArmed;
            setSlideArmed(nowArmed);
            if (nowArmed) haptics.light();
          }
        }}
        onPressOut={() => {
          clearHold();
          if (holdActive.current && armed.current) {
            openLog();
          }
        }}
        onPress={() => {
          if (!holdActive.current) tapTicket();
          holdActive.current = false;
        }}
        hitSlop={{ top: 10, bottom: 8, left: 14, right: 14 }}
      >
        <View style={styles.pocket}>
          <Animated.View style={[styles.ticket, nudgeStyle]}>
            <Ionicons name="albums" size={18} color={tokens.colors.inverseFg} />
            <View style={styles.perf} />
          </Animated.View>
        </View>
      </Pressable>

      <Modal visible={popup} transparent animationType="none" onRequestClose={() => setPopup(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPopup(false)} />
        <Animated.View
          entering={FadeInDown.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[styles.logPill, { bottom: 128, transform: [{ scale: slideArmed ? 1.08 : 1 }] }]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={openLog}
            accessibilityRole="button"
            accessibilityLabel="Log a show"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
          >
            <Ionicons name="add" size={20} color={tokens.colors.inverseFg} />
            <Text style={styles.logPillText}>Log a show</Text>
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
}
