// A10 — "LAST NIGHT" resume card. Picks up a deferred memory (or the most
// recent unshared show) and sends the user straight to the photo step.
// Monochrome, both modes, SpringPressable + haptics, FadeInDown entrance.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import type { ResumeItem } from './useResume';

export function ResumeCard({
  item,
  onDismiss,
}: {
  item: ResumeItem;
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
    headText: { flex: 1, minWidth: 0, gap: 4 },
    eyebrow: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    sub: { fontSize: 13, fontWeight: '400', color: t.colors.textSoft },
    dismiss: { padding: 4, marginTop: -2, marginRight: -2 },
  }));

  const onAdd = () => {
    router.push({ pathname: '/log/memory', params: { logId: item.logId } });
  };

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.eyebrow}>Last night</Text>
            <Text style={styles.title} numberOfLines={2}>
              {item.eventName}
            </Text>
            <Text style={styles.sub}>Add the photos while it’s fresh.</Text>
          </View>
          <SpringPressable
            haptic="light"
            onPress={onDismiss}
            style={styles.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss last night’s memory"
          >
            <Ionicons name="close" size={18} color={tokens.colors.mute} />
          </SpringPressable>
        </View>
        <PillButton
          title="Add the photos"
          variant="primary"
          size="lg"
          springFeedback
          haptic="medium"
          onPress={onAdd}
        />
      </View>
    </Animated.View>
  );
}
