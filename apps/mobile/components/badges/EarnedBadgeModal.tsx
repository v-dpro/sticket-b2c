import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import ConfettiCannon from 'react-native-confetti-cannon';

import type { Badge } from '../../types/badge';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { getRarityColor } from './BadgeIcon';

export function EarnedBadgeModal({
  badge,
  visible,
  onClose,
}: {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { tokens } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    card: {
      width: '100%',
      backgroundColor: t.colors.card,
      borderRadius: 20,
      padding: 24,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      alignItems: 'center',
    },
    iconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 18,
    },
    kicker: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 12,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginBottom: 6,
      fontWeight: '600',
    },
    title: { fontSize: 26, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: -0.4 },
    description: { fontSize: 14, color: t.colors.mute, textAlign: 'center', marginBottom: 16 },
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: t.colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
    },
    pillText: { fontFamily: t.fontFamilies.mono, fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
    button: { backgroundColor: t.colors.inverseBg, paddingHorizontal: 40, paddingVertical: 12, borderRadius: 999 },
    buttonText: { color: t.colors.inverseFg, fontSize: 16, fontWeight: '700' },
  }));

  useEffect(() => {
    if (visible && badge) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }).start();

      const t = setTimeout(() => {
        confettiRef.current?.start?.();
      }, 250);

      return () => clearTimeout(t);
    }

    scaleAnim.setValue(0);
    return;
  }, [visible, badge, scaleAnim]);

  if (!badge) return null;

  const rarityColor = getRarityColor(tokens.colors, badge.rarity);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BlurView intensity={70} style={styles.container}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={[styles.iconContainer, { borderColor: rarityColor, backgroundColor: `${rarityColor}15` }]}>
            <Ionicons name={badge.icon as any} size={60} color={rarityColor} />
          </View>

          <Text style={styles.kicker}>Badge earned</Text>
          <Text style={[styles.title, { color: rarityColor }]}>{badge.name}</Text>
          <Text style={styles.description}>{badge.description}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.pill, { backgroundColor: `${rarityColor}20` }]}>
              <Text style={[styles.pillText, { color: rarityColor }]}>{badge.rarity.toUpperCase()}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="star" size={12} color={tokens.colors.warning} />
              <Text style={[styles.pillText, { color: tokens.colors.warning }]}>+{badge.points} pts</Text>
            </View>
          </View>

          <SpringPressable style={styles.button} onPress={onClose} haptic="light" accessibilityRole="button">
            <Text style={styles.buttonText}>Awesome!</Text>
          </SpringPressable>
        </Animated.View>

        <ConfettiCannon
          ref={confettiRef}
          count={90}
          origin={{ x: 0, y: 0 }}
          autoStart={false}
          fadeOut
          colors={[rarityColor, tokens.colors.brandCyan, tokens.colors.brandPurple, tokens.colors.fg]}
        />
      </BlurView>
    </Modal>
  );
}
