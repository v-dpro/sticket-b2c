// Explore · PUBLIC PARTIES — the Partiful rail. Party cards are stubs
// (an invite is a ticket): title, event line, host with degree ring,
// going count. Tap → the party page (join lives there).

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ExplorePublicParty } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { SpringPressable } from '../ui/SpringPressable';
import { StubPerforation } from '../ui/Stub';

function partyWhen(p: ExplorePublicParty): string {
  const iso = p.startsAt ?? p.event.date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d
    .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    .toUpperCase();
}

export function PartiesRail({ parties }: { parties: ExplorePublicParty[] }) {
  const router = useRouter();
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    header: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      marginBottom: 10,
    },
    label: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    card: {
      width: 240,
      marginRight: 12,
      borderRadius: t.radius.stub,
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 3 },
    title: { fontSize: 15.5, fontWeight: '800', letterSpacing: -0.2, color: t.colors.fg },
    when: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    eventLine: { fontSize: 12.5, color: t.colors.mute },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    footMono: {
      flex: 1,
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
  }));

  if (parties.length === 0) return null;

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.label}>Parties forming</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: tokens.density.pad }}
      >
        {parties.map((party) => (
          <SpringPressable
            key={party.id}
            haptic="light"
            onPress={() => router.push(`/party/${party.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`${party.title}, ${partyWhen(party)}`}
            style={styles.card}
          >
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {party.title}
              </Text>
              <Text style={styles.when}>{partyWhen(party)}</Text>
              <Text style={styles.eventLine} numberOfLines={1}>
                {party.event.name}
                {party.event.venue?.name ? ` · ${party.event.venue.name}` : ''}
              </Text>
            </View>
            <StubPerforation notchColor={tokens.colors.bg} dashColor={tokens.colors.dash} />
            <View style={styles.footer}>
              <DegreeFacepile
                people={[party.host]}
                size={20}
                max={1}
                surfaceColor={tokens.colors.card}
              />
              <Text style={styles.footMono} numberOfLines={1}>
                @{party.host.username} · {party.goingCount} GOING
              </Text>
            </View>
          </SpringPressable>
        ))}
      </ScrollView>
    </View>
  );
}
