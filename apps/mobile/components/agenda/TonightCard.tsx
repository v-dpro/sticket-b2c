// A6 — "TONIGHT" one-tap log card. Full-width pinned card: event name (800),
// a mono "venue · TONIGHT" data line, and a primary "Log this show" that
// deep-links into the log flow with the ticket's seat coordinates prefilled.
// Monochrome, both modes, SpringPressable + light haptics, FadeInDown entrance.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { TonightItem } from './useTonight';

export function TonightCard({
  item,
  onDismiss,
}: {
  item: TonightItem;
  onDismiss: () => void;
}) {
  const router = useRouter();
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    wrap: {
      paddingHorizontal: t.density.pad,
      paddingTop: t.density.gap,
      paddingBottom: 4,
    },
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.xl,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      padding: t.density.cardPad,
      gap: 14,
      ...t.shadows.card,
    },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    headText: { flex: 1, minWidth: 0, gap: 5 },
    title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    meta: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    dismiss: { padding: 4, marginTop: -2, marginRight: -2 },
  }));

  const onLog = () => {
    router.push({
      pathname: '/log/details',
      params: {
        eventId: item.eventId,
        ...(item.section ? { section: item.section } : {}),
        ...(item.row ? { row: item.row } : {}),
        ...(item.seat ? { seat: item.seat } : {}),
      },
    });
  };

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.title} numberOfLines={2}>
              {item.eventName}
            </Text>
            <Text style={styles.meta} numberOfLines={1}>
              {item.venueName} · Tonight
            </Text>
          </View>
          <SpringPressable
            haptic="light"
            onPress={onDismiss}
            style={styles.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss tonight’s show"
          >
            <Ionicons name="close" size={18} color={tokens.colors.mute} />
          </SpringPressable>
        </View>
        <PillButton
          title="Log this show"
          variant="primary"
          size="lg"
          springFeedback
          haptic="medium"
          onPress={onLog}
        />
      </View>
    </Animated.View>
  );
}
