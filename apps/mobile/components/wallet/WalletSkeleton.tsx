import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

function usePulse() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
  }, [progress]);
  return useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [0.4, 0.9]) }));
}

function SkeletonRow() {
  const pulse = usePulse();
  const styles = useThemedStyles((t) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: 12,
      marginHorizontal: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatar: { width: 60, height: 60, borderRadius: t.radius.md, backgroundColor: t.colors.card2 },
    info: { flex: 1, marginLeft: 12 },
    line: { height: 10, borderRadius: 6, backgroundColor: t.colors.card2 },
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.avatar, pulse]} />
      <View style={styles.info}>
        <Animated.View style={[styles.line, { width: '60%' }, pulse]} />
        <Animated.View style={[styles.line, { width: '45%', marginTop: 8 }, pulse]} />
        <Animated.View style={[styles.line, { width: '70%', marginTop: 8 }, pulse]} />
      </View>
    </View>
  );
}

export function WalletSkeleton() {
  const { tokens } = useTheme();
  const pulse = usePulse();

  return (
    <View style={{ paddingTop: 12 }}>
      <Animated.View
        style={[
          {
            marginHorizontal: 16,
            marginBottom: 16,
            height: 120,
            borderRadius: tokens.radius.lg,
            backgroundColor: tokens.colors.card,
            borderWidth: 1,
            borderColor: tokens.colors.hairline,
          },
          pulse,
        ]}
      />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}
