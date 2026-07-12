// BottomSheet — the app's ONE bottom-sheet shell. Every popup that slides
// up from the bottom (likers, were-here, share, seat section, co-authors,
// party invites) renders inside this. Dismissal is physical, never a
// button: tap the backdrop, swipe the sheet down past 120px / fling it
// (velocity > 800), or Android back. Entrance is springs.sheet from below;
// exit is a 180ms slide-out, after which the parent's onClose runs.
//
// The swipe-down pan lives on a ~56px grab region over the grabber/header
// only — NOT the whole sheet — so inner FlatLists/ScrollViews keep their
// scroll (the iOS-sheet pattern). Fully tokenized via useThemedStyles.

import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics, springs } from '../../lib/motion';
import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

const EXIT_MS = 180;
/** Swipe travel past which release dismisses. */
const DISMISS_TRAVEL = 120;
/** Downward fling velocity that dismisses regardless of travel. */
const DISMISS_VELOCITY = 800;
/** Grab region height — covers the grabber + the sheet's header row. */
const GRAB_ZONE = 56;

type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  /** The parent's actual close (state setter). Runs after the exit slide. */
  onClose: () => void;
  /** Sheet height cap as a fraction of the window. */
  maxHeightRatio?: number;
  accessibilityLabel?: string;
}>;

export function BottomSheet({
  visible,
  onClose,
  children,
  maxHeightRatio = 0.75,
  accessibilityLabel,
}: BottomSheetProps) {
  const styles = useThemedStyles(buildStyles);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();

  // The Modal stays mounted through the exit animation, then unmounts.
  const [mounted, setMounted] = useState(false);
  const translateY = useSharedValue(winH);
  const backdrop = useSharedValue(0);
  const closing = useSharedValue(false);

  // Self-initiated dismissal (backdrop / swipe / Android back) ends here:
  // unmount, then hand control back to the parent.
  const completeDismiss = useCallback(() => {
    setMounted(false);
    onClose();
  }, [onClose]);

  // Parent-initiated close (visible flipped false, e.g. after a confirm)
  // ends here: the parent already knows, just unmount.
  const unmountOnly = useCallback(() => {
    setMounted(false);
  }, []);

  const dismiss = useCallback(() => {
    if (closing.value) return;
    closing.value = true;
    backdrop.value = withTiming(0, { duration: EXIT_MS });
    translateY.value = withTiming(winH, { duration: EXIT_MS }, (finished) => {
      if (finished) runOnJS(completeDismiss)();
    });
  }, [backdrop, closing, completeDismiss, translateY, winH]);

  useEffect(() => {
    if (visible) {
      if (!mounted) {
        setMounted(true);
        return; // effect re-runs with mounted=true and animates in
      }
      closing.value = false;
      translateY.value = winH;
      translateY.value = withSpring(0, springs.sheet);
      backdrop.value = withTiming(1, { duration: 200 });
    } else if (mounted && !closing.value) {
      closing.value = true;
      backdrop.value = withTiming(0, { duration: EXIT_MS });
      translateY.value = withTiming(winH, { duration: EXIT_MS }, (finished) => {
        if (finished) runOnJS(unmountOnly)();
      });
    }
  }, [visible, mounted, backdrop, closing, translateY, unmountOnly, winH]);

  // Swipe-down on the grab region: sheet follows the finger (rubber-bands a
  // few px upward), release past the travel/velocity threshold dismisses,
  // otherwise it springs back. activeOffsetY(10) = downward intent only.
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .onUpdate((e) => {
          if (closing.value) return;
          translateY.value =
            e.translationY > 0 ? e.translationY : Math.max(e.translationY / 10, -6);
        })
        .onEnd((e) => {
          if (closing.value) return;
          if (e.translationY > DISMISS_TRAVEL || e.velocityY > DISMISS_VELOCITY) {
            closing.value = true;
            runOnJS(haptics.light)();
            backdrop.value = withTiming(0, { duration: EXIT_MS });
            translateY.value = withTiming(winH, { duration: EXIT_MS }, (finished) => {
              if (finished) runOnJS(completeDismiss)();
            });
          } else {
            translateY.value = withSpring(0, springs.sheet);
          }
        }),
    [backdrop, closing, completeDismiss, translateY, winH],
  );

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={dismiss}>
      {/* RN Modals host a separate native window — RNGH needs its own root here. */}
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={dismiss}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { maxHeight: winH * maxHeightRatio, paddingBottom: Math.max(insets.bottom, 16) },
            sheetStyle,
          ]}
          accessibilityLabel={accessibilityLabel}
        >
          <View style={styles.grabRow}>
            <View style={styles.grabber} />
          </View>

          {children}

          {/* Invisible grab strip over the grabber + header — the pan lives
              here so inner lists scroll freely below it. */}
          <GestureDetector gesture={pan}>
            <View style={styles.grabZone} />
          </GestureDetector>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: tokens.colors.card,
      borderTopLeftRadius: tokens.radius.hero,
      borderTopRightRadius: tokens.radius.hero,
      borderTopWidth: 1,
      borderColor: tokens.colors.hairline,
    },
    grabRow: {
      paddingTop: 10,
      paddingBottom: 12,
      alignItems: 'center',
    },
    grabber: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: tokens.colors.line,
    },
    grabZone: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: GRAB_ZONE,
    },
  });
