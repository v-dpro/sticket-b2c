// RatingStars — star-rating display with the spec stagger-pop
// (INTERACTIONS.md: each star pops scale 0.8 → 1.15 → 1.0 with a 40ms
// stagger, reveal-from-left). Supports half-star ratings (★★★★½).

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useTheme } from '../../lib/theme-context';
import { motionDurations, springs } from '../../lib/motion';

type RatingStarsProps = {
  rating: number; // 0–5, halves supported
  size?: number;
  color?: string;
  emptyColor?: string;
  /** Stagger-pop stars in on mount. Default true. */
  animated?: boolean;
  gap?: number;
};

function iconFor(index: number, rating: number): 'star' | 'star-half' | 'star-outline' {
  if (rating >= index + 1) return 'star';
  if (rating >= index + 0.5) return 'star-half';
  return 'star-outline';
}

function Star({
  index,
  icon,
  size,
  color,
  animated,
}: {
  index: number;
  icon: 'star' | 'star-half' | 'star-outline';
  size: number;
  color: string;
  animated: boolean;
}) {
  const scale = useSharedValue(animated ? 0.8 : 1);
  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (!animated) return;
    const delay = index * motionDurations.starStagger;
    scale.value = withDelay(
      delay,
      withSequence(withTiming(1.15, { duration: 120 }), withSpring(1, springs.press)),
    );
    opacity.value = withDelay(delay, withTiming(1, { duration: 120 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animated, index]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name={icon} size={size} color={color} />
    </Animated.View>
  );
}

export function RatingStars({
  rating,
  size = 12,
  color,
  emptyColor,
  animated = true,
  gap = 2,
}: RatingStarsProps) {
  const { tokens } = useTheme();
  const resolvedColor = color ?? tokens.colors.brandCyan;
  const resolvedEmptyColor = emptyColor ?? tokens.colors.textLo;
  return (
    <View
      style={[styles.row, { gap }]}
      accessible
      accessibilityLabel={`Rated ${rating} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const icon = iconFor(i, rating);
        return (
          <Star
            key={i}
            index={i}
            icon={icon}
            size={size}
            color={icon === 'star-outline' ? resolvedEmptyColor : resolvedColor}
            animated={animated}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
