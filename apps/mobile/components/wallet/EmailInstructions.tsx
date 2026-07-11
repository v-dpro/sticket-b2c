import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import { SpringPressable } from '../ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

const EMAIL_ADDRESS = 'tickets@sticket.in';

export function EmailInstructions() {
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    container: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      padding: 24,
      marginHorizontal: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    iconContainer: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: '700', color: t.colors.fg, marginBottom: 8 },
    description: { fontSize: 14, color: t.colors.mute, textAlign: 'center', marginBottom: 12 },
    emailContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 8,
    },
    email: { fontFamily: t.fontFamilies.mono, fontSize: 15, fontWeight: '600', color: t.colors.accent },
    hint: { fontSize: 12, color: t.colors.muteSoft, textAlign: 'center', marginTop: 12, lineHeight: 18 },
    supportedList: { marginTop: 20, alignItems: 'center' },
    supportedTitle: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      color: t.colors.muteSoft,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 8,
    },
    supportedRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    badge: {
      backgroundColor: t.colors.card2,
      borderRadius: t.radius.full,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    badgeText: { fontSize: 11, color: t.colors.textSoft, fontWeight: '600' },
  }));

  const handleCopyEmail = async () => {
    await Clipboard.setStringAsync(EMAIL_ADDRESS);
  };

  const SupportedBadge = ({ name }: { name: string }) => (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{name}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail" size={32} color={tokens.colors.fg} />
      </View>

      <Text style={styles.title}>Forward Your Tickets</Text>

      <Text style={styles.description}>Forward your ticket confirmation emails to:</Text>

      <SpringPressable style={styles.emailContainer} onPress={handleCopyEmail} haptic="light" accessibilityRole="button">
        <Text style={styles.email}>{EMAIL_ADDRESS}</Text>
        <Ionicons name="copy-outline" size={18} color={tokens.colors.accent} />
      </SpringPressable>

      <Text style={styles.hint}>
        We'll automatically extract your ticket details and add them to your wallet.
      </Text>

      <View style={styles.supportedList}>
        <Text style={styles.supportedTitle}>Supported</Text>
        <View style={styles.supportedRow}>
          <SupportedBadge name="Ticketmaster" />
          <SupportedBadge name="AXS" />
          <SupportedBadge name="Eventbrite" />
        </View>
        <View style={styles.supportedRow}>
          <SupportedBadge name="SeatGeek" />
          <SupportedBadge name="Dice" />
          <SupportedBadge name="More..." />
        </View>
      </View>
    </View>
  );
}
