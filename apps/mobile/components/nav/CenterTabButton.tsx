// CenterTabButton — the raised ink circle in the middle of the tab bar.
// TAP opens the Timeline. HOLD pops a "+ Log" pill above it (medium
// haptic); release-after-sliding-up OR tapping the pill starts the log
// flow. A tiny "HOLD ↑" whisper sits above the circle so the gesture is
// discoverable.

import React, { useCallback, useRef, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

const HOLD_MS = 380;
const SLIDE_TRIGGER = 48;

type CenterTabButtonProps = {
  /** The tab's own navigation press (opens Timeline). */
  onPress?: (e?: unknown) => void;
  accessibilityState?: { selected?: boolean };
};

export function CenterTabButton({ onPress, accessibilityState }: CenterTabButtonProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const focused = accessibilityState?.selected ?? false;
  void focused; // selection reads through the filled circle itself

  const [popup, setPopup] = useState(false);
  const [slideArmed, setSlideArmed] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdActive = useRef(false);
  const startY = useRef(0);
  const armed = useRef(false);

  const styles = useThemedStyles((t) => ({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 2, overflow: 'visible' },
    hint: {
      position: 'absolute',
      top: -26,
      alignSelf: 'center',
      fontFamily: t.fontFamilies.mono,
      fontSize: 8,
      fontWeight: '600',
      letterSpacing: 1,
      color: t.colors.muteSoft,
    },
    circle: {
      width: 54,
      height: 54,
      borderRadius: 27,
      marginTop: -14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.inverseBg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 8,
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

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>HOLD ↑</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Timeline. Hold to log a show."
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
            // Slid up while holding — release fires the log.
            openLog();
          }
          // Held without sliding: popup stays for a tap.
          // Short tap: fall through to onPress (navigation).
        }}
        onPress={() => {
          if (!holdActive.current) onPress?.();
          holdActive.current = false;
        }}
        style={styles.circle}
        hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
      >
        <Ionicons name="albums" size={24} color={tokens.colors.inverseFg} />
      </Pressable>

      <Modal visible={popup} transparent animationType="none" onRequestClose={() => setPopup(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPopup(false)} />
        <Animated.View
          entering={FadeInDown.duration(160)}
          exiting={FadeOut.duration(120)}
          style={[
            styles.logPill,
            { bottom: 128, transform: [{ scale: slideArmed ? 1.08 : 1 }] },
          ]}
          // The pill floats above the tab bar; height anchor keeps it clear
          // of the home indicator across devices.
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
