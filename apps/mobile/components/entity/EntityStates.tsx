// EntityStates — loading skeletons and the full-page error state shared
// by the entity pages. Themed (both modes), monochrome buttons.

import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';

// ── EntityError — full-screen "couldn't load" with retry + back ───

export function EntityError({
  title,
  message,
  onRetry,
  onBack,
}: {
  title: string;
  message?: string | null;
  onRetry?: () => void;
  onBack?: () => void;
}) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: t.density.gap,
    },
    title: { fontSize: 17, fontWeight: '800', color: t.colors.fg, textAlign: 'center' },
    body: { fontSize: 14, color: t.colors.textSoft, textAlign: 'center', lineHeight: 20 },
  }));

  return (
    <View style={styles.wrap}>
      <Ionicons name="cloud-offline-outline" size={40} color={tokens.colors.muteSoft} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.body}>{message}</Text> : null}
      {onRetry ? <PillButton title="Try again" springFeedback haptic="light" onPress={onRetry} /> : null}
      {onBack ? <PillButton title="Go back" variant="ghost" springFeedback haptic="light" onPress={onBack} /> : null}
    </View>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────
// Themed shimmer block (opacity pulse via card2 — correct in both modes).

export function ShimmerBlock({
  width = '100%',
  height = 16,
  borderRadius,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: object;
}) {
  const { tokens } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.45, 1]),
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? tokens.radius.sm,
          backgroundColor: tokens.colors.card2,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** N standard row skeletons (image square + two text lines + chip). */
export function RowSkeletons({ count = 5 }: { count?: number }) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: t.density.pad,
      paddingVertical: 10,
    },
  }));

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <ShimmerBlock width={44} height={44} borderRadius={tokens.radius.md} />
          <View style={{ flex: 1, gap: 8 }}>
            <ShimmerBlock width="58%" height={13} borderRadius={7} />
            <ShimmerBlock width="40%" height={11} borderRadius={6} />
          </View>
          <ShimmerBlock width={54} height={22} borderRadius={tokens.radius.sm} />
        </View>
      ))}
    </View>
  );
}

/** Entity-page loading scaffold: hero block + name lines + rows. */
export function EntityPageSkeleton({ hero = true }: { hero?: boolean }) {
  const { tokens } = useTheme();
  return (
    <View>
      {hero ? (
        <ShimmerBlock width="100%" height={200} borderRadius={0} />
      ) : null}
      <View style={{ paddingHorizontal: tokens.density.pad, paddingTop: 18, gap: 10 }}>
        <ShimmerBlock width="62%" height={22} borderRadius={8} />
        <ShimmerBlock width="38%" height={13} borderRadius={7} />
      </View>
      <View style={{ height: 14 }} />
      <RowSkeletons count={4} />
    </View>
  );
}
