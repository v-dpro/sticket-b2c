// Explore · PUBLIC PARTIES — the Partiful rail (C21). Party cards are stubs
// (an invite is a ticket, §1.4 allows notches on invite cards): title
// 14.5/800, an event mono line, N GOING, host avatar with degree ring +
// "@HOST HOSTS", and a primary Join. Tap the card or Join → the party page
// (the request/approve flow lives there).

import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { ExplorePublicParty } from '../../lib/api/explore';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { DegreeFacepile } from '../ui/DegreeFacepile';
import { PillButton } from '../ui/PillButton';
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
      width: 258,
      marginRight: 12,
      borderRadius: t.radius.stub,
      borderWidth: 1.5,
      borderColor: t.colors.fg,
      backgroundColor: t.colors.card,
      overflow: 'hidden',
    },
    body: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 4 },
    title: { fontSize: 14.5, fontWeight: '800', letterSpacing: -0.2, color: t.colors.fg },
    eventLine: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    goingLine: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    hostLine: {
      flex: 1,
      fontFamily: t.fontFamilies.monoSemi,
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
              <Text style={styles.eventLine} numberOfLines={1}>
                {[partyWhen(party), party.event.venue?.name].filter(Boolean).join(' · ')}
              </Text>
              <Text style={styles.goingLine}>{party.goingCount} GOING</Text>
            </View>
            <StubPerforation notchColor={tokens.colors.bg} dashColor={tokens.colors.dash} />
            <View style={styles.footer}>
              <DegreeFacepile
                people={[party.host]}
                size={20}
                max={1}
                surfaceColor={tokens.colors.card}
              />
              <Text style={styles.hostLine} numberOfLines={1}>
                @{party.host.username} HOSTS
              </Text>
              <PillButton
                title="Join"
                variant="primary"
                size="sm"
                springFeedback
                haptic="light"
                onPress={() => router.push(`/party/${party.id}`)}
              />
            </View>
          </SpringPressable>
        ))}
      </ScrollView>
    </View>
  );
}
