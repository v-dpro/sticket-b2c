import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors } from '../../lib/theme';

export function EmptyWallet() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="ticket-outline" size={48} color={colors.brandPurple} />
      </View>

      <Text style={styles.title}>No Tickets Yet</Text>

      <Text style={styles.subtitle}>
        Add your tickets to keep them all in one place and never miss a show.
      </Text>

      <Pressable style={styles.button} onPress={() => router.push('/wallet/add-ticket')}>
        <LinearGradient
          colors={[colors.brandPurple, colors.brandPink]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        >
          <Ionicons name="add" size={20} color={colors.textHi} />
          <Text style={styles.buttonText}>Add Ticket</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 24,
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textHi,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textHi,
  },
});



