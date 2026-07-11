import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { PillButton } from '../ui/PillButton';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export function EmptyWallet() {
  const router = useRouter();
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
      marginTop: 24,
      marginBottom: 24,
      gap: 8,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: t.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: t.colors.fg,
      letterSpacing: -0.4,
    },
    subtitle: {
      fontSize: 15,
      color: t.colors.mute,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 16,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="ticket-outline" size={48} color={tokens.colors.fg} />
      </View>

      <Text style={styles.title}>No Tickets Yet</Text>

      <Text style={styles.subtitle}>
        Add your tickets to keep them all in one place and never miss a show.
      </Text>

      <PillButton
        title="Add Ticket"
        variant="primary"
        size="lg"
        onPress={() => router.push('/wallet/add-ticket')}
        icon={<Ionicons name="add" size={18} color={tokens.colors.inverseFg} />}
        springFeedback
        haptic="light"
      />
    </View>
  );
}
