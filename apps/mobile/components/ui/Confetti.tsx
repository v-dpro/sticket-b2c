import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const COLORS = ['#FF4B5C', '#FFD166', '#8EE7A2', '#7C3AED', '#60A5FA'];
const COUNT = 40;
const DURATION = 1600;

type Particle = {
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
  shape: 'rect' | 'circle';
};

type ConfettiProps = {
  active: boolean;
  originX?: number; // 0-1, default 0.5
  originY?: number; // 0-1, default 0.4
};

export function Confetti({ active, originX = 0.5, originY = 0.4 }: ConfettiProps) {
  const particles = useRef<Particle[]>([]);
  const hasTriggered = useRef(false);

  if (particles.current.length === 0) {
    particles.current = Array.from({ length: COUNT }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(0),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 5,
      shape: Math.random() < 0.5 ? 'rect' : 'circle',
    }));
  }

  useEffect(() => {
    if (!active || hasTriggered.current) return;
    hasTriggered.current = true;

    const ox = SCREEN_W * originX;
    const oy = SCREEN_H * originY;

    particles.current.forEach((p) => {
      const vx = (Math.random() - 0.5) * SCREEN_W * 0.8;
      const vy = -(Math.random() * SCREEN_H * 0.4 + SCREEN_H * 0.1);
      const endX = ox + vx;
      const endY = oy + vy + SCREEN_H * 0.6; // gravity pulls down

      p.x.setValue(ox);
      p.y.setValue(oy);
      p.rotate.setValue(0);
      p.opacity.setValue(1);

      Animated.parallel([
        Animated.timing(p.x, {
          toValue: endX,
          duration: DURATION,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.y, {
            toValue: oy + vy * 0.6,
            duration: DURATION * 0.4,
            useNativeDriver: true,
          }),
          Animated.timing(p.y, {
            toValue: endY,
            duration: DURATION * 0.6,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(p.rotate, {
          toValue: (Math.random() - 0.5) * 720,
          duration: DURATION,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(DURATION * 0.6),
          Animated.timing(p.opacity, {
            toValue: 0,
            duration: DURATION * 0.4,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    });
  }, [active, originX, originY]);

  if (!active) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.current.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.shape === 'rect' ? p.size * 0.5 : p.size,
              borderRadius: p.shape === 'circle' ? p.size / 2 : 1,
              backgroundColor: p.color,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [-720, 720],
                    outputRange: ['-720deg', '720deg'],
                  }),
                },
              ],
              opacity: p.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  particle: {
    position: 'absolute',
  },
});
