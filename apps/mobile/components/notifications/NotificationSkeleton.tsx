import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, spacing } from '../../lib/theme';

export function NotificationSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View>
      {[1, 2, 3, 4, 5].map((i) => (
        <Animated.View key={i} style={[styles.item, { opacity }]}>
          <View style={styles.avatar} />
          <View style={styles.content}>
            <View style={styles.line1} />
            <View style={styles.line2} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    marginRight: spacing.md,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  line1: {
    width: '80%',
    height: 14,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  line2: {
    width: '40%',
    height: 12,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 4,
  },
});



