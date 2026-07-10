// SpringNumber — animated count-up number (INTERACTIONS.md).
// Drives a TextInput's `text` prop from a Reanimated shared value so the
// count ticks on the UI thread (no JS-thread re-renders per frame).
// A hidden ghost <Text> with the final value drives layout, since native
// text updates via animatedProps bypass React/Yoga measurement.

import { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { springs } from '../../lib/motion';

// Allow the `text` prop to be driven from the UI thread.
Animated.addWhitelistedNativeProps({ text: true });

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type SpringNumberProps = {
  value: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
  /** Animate from 0 on first mount (profile stats, XP). Default true. */
  animateOnMount?: boolean;
  /** 'spring' ticks with springs.number; 'timing' eases over `duration`. */
  mode?: 'spring' | 'timing';
  /** Only used when mode === 'timing'. Default 900ms (profile stats spec). */
  duration?: number;
  /** Insert thousands separators. Default true. */
  grouped?: boolean;
};

function format(n: number, prefix: string, suffix: string, grouped: boolean): string {
  'worklet';
  const rounded = Math.round(n);
  const raw = Math.abs(rounded).toString();
  const body = grouped ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : raw;
  return `${rounded < 0 ? '-' : ''}${prefix}${body}${suffix}`;
}

export function SpringNumber({
  value,
  style,
  prefix = '',
  suffix = '',
  animateOnMount = true,
  mode = 'spring',
  duration = 900,
  grouped = true,
}: SpringNumberProps) {
  const mounted = useRef(false);
  const progress = useSharedValue(animateOnMount ? 0 : value);

  useEffect(() => {
    // First run animates from 0 (if requested); later runs chase new values.
    if (!mounted.current) {
      mounted.current = true;
      if (!animateOnMount) return;
    }
    progress.value =
      mode === 'timing'
        ? withTiming(value, { duration, easing: Easing.out(Easing.cubic) })
        : withSpring(value, { ...springs.number, overshootClamping: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, mode, duration]);

  const animatedProps = useAnimatedProps(() => {
    return { text: format(progress.value, prefix, suffix, grouped) } as any;
  });

  const finalText = format(value, prefix, suffix, grouped);

  return (
    <View accessible accessibilityLabel={finalText}>
      {/* Ghost text sizes the container to the final value. */}
      <Text style={[style, styles.ghost]} allowFontScaling={false}>
        {finalText}
      </Text>
      <AnimatedTextInput
        editable={false}
        defaultValue={format(animateOnMount ? 0 : value, prefix, suffix, grouped)}
        animatedProps={animatedProps}
        style={[styles.input, style, styles.overlay]}
        underlineColorAndroid="transparent"
        allowFontScaling={false}
        importantForAccessibility="no"
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ghost: {
    opacity: 0,
  },
  input: {
    padding: 0,
    margin: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
