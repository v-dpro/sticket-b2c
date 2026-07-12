// PresaleRail — "PRESALES THIS WEEK", the utility rail that opens the
// stanza (C14). Compact plain chips (entities, never stubs — C3): artist
// 13.5/700, mono datetime, and a bordered mono code chip when the presale
// carries one. Tap → /presales/[id].

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ExplorePresale } from '../../lib/api/explore';
import { useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { presaleWhen } from './format';

type PresaleRailProps = {
  presales: ExplorePresale[];
};

export function PresaleRail({ presales }: PresaleRailProps) {
  const router = useRouter();
  const styles = useThemedStyles((t) => ({
    head: {
      paddingHorizontal: t.density.pad,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    title: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    link: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    rail: {
      paddingHorizontal: t.density.pad,
      gap: 8,
    },
    chip: {
      minWidth: 168,
      maxWidth: 220,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 5,
      borderRadius: t.radius.card,
      backgroundColor: t.colors.card,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    artist: { fontSize: 13.5, fontWeight: '700', letterSpacing: -0.2, color: t.colors.fg },
    when: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    codeRow: { flexDirection: 'row', marginTop: 2 },
    codeChip: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: t.radius.chip,
      backgroundColor: t.colors.card2,
    },
    codeText: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.text,
    },
  }));

  if (presales.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title}>Presales this week</Text>
        <SpringPressable
          haptic="light"
          onPress={() => router.push('/presales')}
          accessibilityRole="button"
          accessibilityLabel="All presales"
        >
          <Text style={styles.link}>All</Text>
        </SpringPressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {presales.slice(0, 10).map((presale) => (
          <SpringPressable
            key={presale.id}
            haptic="light"
            onPress={() => router.push(`/presales/${presale.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${presale.artistName} ${presale.presaleType} presale`}
            style={styles.chip}
          >
            <Text style={styles.artist} numberOfLines={1}>
              {presale.artistName}
            </Text>
            <Text style={styles.when} numberOfLines={1}>
              {[presale.presaleType, presaleWhen(presale.presaleStart)].filter(Boolean).join(' · ')}
            </Text>
            {presale.code ? (
              <View style={styles.codeRow}>
                <View style={styles.codeChip}>
                  <Text style={styles.codeText}>{presale.code}</Text>
                </View>
              </View>
            ) : null}
          </SpringPressable>
        ))}
      </ScrollView>
    </View>
  );
}
