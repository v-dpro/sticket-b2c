// Motion — shared animation primitives for Sticket.
// React Native equivalents of the web motion.jsx.
// Uses react-native Animated API for broad compatibility.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';

// ─── useSpring: tween a value toward a target with damping ──────
// Returns an Animated.Value that chases `target`.
export function useSpringValue(target: number, config?: { stiffness?: number; damping?: number; mass?: number }) {
  const anim = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: target,
      stiffness: config?.stiffness ?? 180,
      damping: config?.damping ?? 22,
      mass: config?.mass ?? 1,
      useNativeDriver: true,
    }).start();
  }, [target, anim, config?.stiffness, config?.damping, config?.mass]);

  return anim;
}

// ─── useCountUp: animated number counter (easeOutCubic) ──────────
// Returns the current displayed number.
export function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const from = 0;
    let frame: ReturnType<typeof requestAnimationFrame>;

    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(from + (target - from) * e));
      if (p < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

// ─── useStamp: Animated values for stamp entrance ─────────────────
// Scale: 1.8 → 0.94 → 1.0, with rotation.
export function useStamp(trigger: boolean, delay = 0) {
  const scale = useRef(new Animated.Value(1.8)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(-18)).current;

  useEffect(() => {
    if (!trigger) return;

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          stiffness: 260,
          damping: 18,
          mass: 0.8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(rotate, {
          toValue: -6,
          stiffness: 200,
          damping: 20,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [trigger, delay, scale, opacity, rotate]);

  const rotateStr = rotate.interpolate({
    inputRange: [-18, -6],
    outputRange: ['-18deg', '-6deg'],
  });

  return {
    transform: [{ scale }, { rotate: rotateStr }],
    opacity,
  };
}

// ─── usePopIn: spring up from below with overshoot ────────────────
export function usePopIn(trigger: boolean, delay = 0, from = 16) {
  const translateY = useRef(new Animated.Value(from)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) {
      translateY.setValue(from);
      scale.setValue(0.92);
      opacity.setValue(0);
      return;
    }

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          stiffness: 200,
          damping: 18,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          stiffness: 200,
          damping: 18,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 260,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [trigger, delay, from, translateY, scale, opacity]);

  return {
    transform: [{ translateY }, { scale }],
    opacity,
  };
}

// ─── useHeartPop: scale 1 → 1.35 → 1 (like button) ──────────────
export function useHeartPop() {
  const scale = useRef(new Animated.Value(1)).current;

  const pop = useCallback(() => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.35,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        stiffness: 260,
        damping: 20,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  return { scale, pop };
}

// ─── useShakeX: horizontal jitter for invalid input ───────────────
export function useShakeX() {
  const translateX = useRef(new Animated.Value(0)).current;

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(translateX, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 5, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -5, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 3, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -3, duration: 50, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, [translateX]);

  return { translateX, shake };
}

// ─── useFloatingGain: drift-up + fade-out for "+50 XP" labels ─────
export function useFloatingGain(trigger: boolean, delay = 0) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;

    const timer = setTimeout(() => {
      opacity.setValue(1);
      translateY.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -60,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(800),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [trigger, delay, translateY, opacity]);

  return {
    transform: [{ translateY }],
    opacity,
  };
}

// ─── usePulse: repeating opacity pulse (for live indicators) ──────
export function usePulse(active = true) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active) {
      opacity.setValue(1);
      return;
    }

    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    anim.start();
    return () => anim.stop();
  }, [active, opacity]);

  return opacity;
}

// ─── usePressScale: tap feedback (scale 0.97 on press) ────────────
export function usePressScale(scale = 0.97) {
  const anim = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(anim, {
      toValue: scale,
      duration: 80,
      useNativeDriver: true,
    }).start();
  }, [anim, scale]);

  const onPressOut = useCallback(() => {
    Animated.spring(anim, {
      toValue: 1,
      stiffness: 260,
      damping: 20,
      useNativeDriver: true,
    }).start();
  }, [anim]);

  return { scale: anim, onPressIn, onPressOut };
}
