// FindPeopleCard — a slim inline nudge shown at the top of the feed when
// the viewer follows no one yet but has their own posts. Not the full
// empty state (that only shows when the feed is truly empty); this is a
// quiet, tappable strip → /find-friends. Monochrome, tokenized.

import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

export function FindPeopleCard() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  return (
    <SpringPressable
      haptic="light"
      onPress={() => router.push('/find-friends')}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel="Find your people — see friends' shows here"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="people-outline" size={18} color={c.fg} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Find your people</Text>
        <Text style={styles.subtitle}>see friends’ shows here</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={c.muteSoft} />
    </SpringPressable>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: 14,
      marginTop: 4,
      marginBottom: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      borderColor: tokens.colors.hairline,
      backgroundColor: tokens.colors.card,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: tokens.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: tokens.colors.card2,
    },
    copy: {
      flex: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: tokens.colors.fg,
    },
    subtitle: {
      fontSize: 12,
      fontWeight: '400',
      color: tokens.colors.mute,
      marginTop: 2,
    },
  });
