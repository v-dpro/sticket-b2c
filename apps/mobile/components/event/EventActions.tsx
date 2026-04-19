import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, accentSets, radius } from '../../lib/theme';

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace' }) ?? 'monospace';

interface EventActionsProps {
  isLogged: boolean;
  isInterested: boolean;
  ticketUrl?: string;
  isPast: boolean;
  onLogPress: () => void;
  onInterestedPress: () => void;
}

export function EventActions({
  isLogged,
  isInterested,
  ticketUrl,
  isPast,
  onLogPress,
  onInterestedPress,
}: EventActionsProps) {
  const handleBuyTickets = () => {
    if (ticketUrl) {
      void Linking.openURL(ticketUrl);
    }
  };

  return (
    <View style={styles.container}>
      {isPast ? (
        <Pressable
          style={[styles.pillButton, isLogged ? styles.pillGhost : styles.pillAccent]}
          onPress={onLogPress}
        >
          {isLogged ? (
            <>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.pillText, { color: colors.success }]}>You were there!</Text>
            </>
          ) : (
            <>
              <Ionicons name="add-circle" size={18} color={colors.ink} />
              <Text style={[styles.pillText, { color: colors.ink }]}>I was there</Text>
            </>
          )}
        </Pressable>
      ) : (
        <>
          {ticketUrl ? (
            <Pressable style={[styles.pillButton, styles.pillAccent]} onPress={handleBuyTickets}>
              <Ionicons name="ticket" size={18} color={colors.ink} />
              <Text style={[styles.pillText, { color: colors.ink }]}>Get Tickets</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.pillButton, styles.pillGhost, isInterested && styles.pillInterestedActive]}
            onPress={onInterestedPress}
          >
            <Ionicons
              name={isInterested ? 'heart' : 'heart-outline'}
              size={18}
              color={isInterested ? colors.error : colors.textMid}
            />
            <Text style={[styles.pillText, { color: isInterested ? colors.error : colors.textMid }]}>
              {isInterested ? 'Interested' : 'Mark Interested'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 9999,
    gap: 8,
  },
  pillAccent: {
    backgroundColor: accentSets.cyan.hex,
  },
  pillGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  pillInterestedActive: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239,68,68,0.08)',
  },
  pillText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
