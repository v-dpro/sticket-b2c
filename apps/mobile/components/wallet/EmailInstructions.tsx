import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const EMAIL_ADDRESS = 'tickets@sticket.in';

export function EmailInstructions() {
  const handleCopyEmail = async () => {
    await Clipboard.setStringAsync(EMAIL_ADDRESS);
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="mail" size={32} color="#8B5CF6" />
      </View>

      <Text style={styles.title}>Forward Your Tickets</Text>

      <Text style={styles.description}>Forward your ticket confirmation emails to:</Text>

      <Pressable style={styles.emailContainer} onPress={handleCopyEmail}>
        <Text style={styles.email}>{EMAIL_ADDRESS}</Text>
        <Ionicons name="copy-outline" size={18} color="#8B5CF6" />
      </Pressable>

      <Text style={styles.hint}>
        We'll automatically extract your ticket details and add them to your wallet.
      </Text>

      <View style={styles.supportedList}>
        <Text style={styles.supportedTitle}>Supported:</Text>
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

function SupportedBadge({ name }: { name: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#A0A0B8',
    textAlign: 'center',
    marginBottom: 12,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0B1E',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  hint: {
    fontSize: 12,
    color: '#6B6B8D',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
  supportedList: {
    marginTop: 20,
    alignItems: 'center',
  },
  supportedTitle: {
    fontSize: 12,
    color: '#6B6B8D',
    marginBottom: 8,
  },
  supportedRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: '#0A0B1E',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    color: '#A0A0B8',
  },
});



