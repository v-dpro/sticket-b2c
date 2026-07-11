// PresaleCard — presale windows matched to an event, with tap-to-copy
// codes (expo-clipboard). Rendered only when matching presales exist.

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';

import type { EventPresale } from '../../lib/api/events';
import { haptics } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';
import { monoDateTime } from './format';

export function PresaleCard({ presales }: { presales: EventPresale[] }) {
  const { tokens } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

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
    windowEnd: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      color: t.colors.mute,
    },
    codeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.sm,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    code: {
      fontFamily: t.fontFamilies.monoBold,
      fontSize: 13,
      letterSpacing: 1,
      color: t.colors.fg,
    },
    copied: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1,
      color: t.colors.accent,
    },
    notes: { fontSize: 12.5, color: t.colors.mute, lineHeight: 18 },
  }));

  const handleCopy = async (presale: EventPresale) => {
    if (!presale.code) return;
    try {
      await Clipboard.setStringAsync(presale.code);
      haptics.success();
      setCopiedId(presale.id);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setCopiedId(null), 1600);
    } catch {
      haptics.error();
    }
  };

  return (
    <View style={styles.card}>
      {presales.map((p, i) => (
        <View key={p.id}>
          {i > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.row}>
            <Text style={styles.type}>{p.presaleType} presale</Text>
            <Text style={styles.window}>
              {monoDateTime(p.presaleStart)}
              {p.presaleEnd ? (
                <Text style={styles.windowEnd}>{`  →  ${monoDateTime(p.presaleEnd)}`}</Text>
              ) : null}
            </Text>
            {p.code ? (
              <SpringPressable
                onPress={() => void handleCopy(p)}
                accessibilityRole="button"
                accessibilityLabel={`Copy presale code ${p.code}`}
                style={styles.codeRow}
              >
                <Text style={styles.code}>{p.code}</Text>
                {copiedId === p.id ? (
                  <Text style={styles.copied}>COPIED</Text>
                ) : (
                  <Ionicons name="copy-outline" size={13} color={tokens.colors.mute} />
                )}
              </SpringPressable>
            ) : null}
            {p.notes ? <Text style={styles.notes}>{p.notes}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}
