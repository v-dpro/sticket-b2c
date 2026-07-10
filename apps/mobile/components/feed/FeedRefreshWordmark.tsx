// FeedRefreshWordmark — pull-to-refresh spinner per INTERACTIONS.md:
// "custom spinner = the Sticket wordmark rotating 360°", 800ms per turn.
// Composed with the system RefreshControl (which keeps the native PTR
// mechanics): on iOS the control's tint is transparent and this overlay
// tracks the pull distance (rotation + fade driven by scroll offset on
// the UI thread); while refreshing it spins continuously.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { colors, fontFamilies } from '../../lib/theme';
import { motionDurations } from '../../lib/motion';

interface FeedRefreshWordmarkProps {
  /** FlatList contentOffset.y (negative while over-pulled on iOS). */
  pullY: SharedValue<number>;
  refreshing: boolean;
}

const PULL_DISTANCE = 70;

export function FeedRefreshWordmark({ pullY, refreshing }: FeedRefreshWordmarkProps) {
  const spin = useSharedValue(0);

  useEffect(() => {
    if (refreshing) {
      spin.value = 0;
      spin.value = withRepeat(
        withTiming(360, { duration: motionDurations.refreshSpin, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(spin);
      spin.value = withTiming(0, { duration: 200 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  const style = useAnimatedStyle(() => {
    const pull = Math.max(0, -pullY.value);
    const pullProgress = Math.min(1, pull / PULL_DISTANCE);
    const opacity = refreshing ? 1 : pullProgress;
    // While pulling, the wordmark winds up with the drag; while
    // refreshing it spins on its own.
    const rotation = refreshing ? spin.value : pullProgress * 270;
    return {
      opacity,
      transform: [{ rotate: `${rotation}deg` }, { scale: 0.7 + 0.3 * (refreshing ? 1 : pullProgress) }],
    };
  });

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.badge, style]}>
        <Text style={styles.wordmark}>s.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 17,
    color: colors.brandCyan,
    marginTop: -2,
  },
});
