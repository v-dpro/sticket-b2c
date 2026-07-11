import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';

import { spacing } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

export function NotificationSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const styles = useThemedStyles((t) => ({
    item: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: t.colors.elevated,
      marginRight: spacing.md,
    },
    line1: {
      width: '80%',
      height: 14,
      backgroundColor: t.colors.elevated,
      borderRadius: 4,
      marginBottom: spacing.sm,
    },
    line2: {
      width: '40%',
      height: 12,
      backgroundColor: t.colors.elevated,
      borderRadius: 4,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
    },
  }));

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



