// PresaleCard — presale windows matched to an event. Informational only:
// type + the state-aware timing line (opens soon / closes soon) + notes.
//
// Compliance: presale CODES are never rendered or copyable here. Surfacing a
// code violates ticketing-platform policy — the API doesn't send one.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { EventPresale } from '../../lib/api/events';
import { useThemedStyles } from '../../lib/theme-context';
import { presaleTiming } from '../explore/format';

export function PresaleCard({ presales }: { presales: EventPresale[] }) {
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
    },
    row: {
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
      gap: 8,
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.hairline },
    type: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    window: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.text,
    },
    notes: { fontSize: 12.5, color: t.colors.mute, lineHeight: 18 },
  }));

  return (
    <View style={styles.card}>
      {presales.map((p, i) => (
        <View key={p.id}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            {/* Some feeds already end the type with "presale" — don't double it. */}
            <Text style={styles.type}>{`${p.presaleType.replace(/\s*presale\s*$/i, '')} presale`}</Text>
            <Text style={styles.window}>{presaleTiming(p.presaleStart, p.presaleEnd)}</Text>
            {p.notes ? <Text style={styles.notes}>{p.notes}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
