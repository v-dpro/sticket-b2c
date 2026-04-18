import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../lib/theme';

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
        <Pressable style={[styles.primaryButton, isLogged && styles.loggedButton]} onPress={onLogPress}>
          {isLogged ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.loggedText}>You were there!</Text>
            </>
          ) : (
            <LinearGradient
              colors={[colors.brandPurple, colors.brandPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Ionicons name="add-circle" size={20} color={colors.textPrimary} />
              <Text style={styles.buttonText}>I was there</Text>
            </LinearGradient>
          )}
        </Pressable>
      ) : (
        <>
          {ticketUrl ? (
            <Pressable style={styles.primaryButton} onPress={handleBuyTickets}>
              <LinearGradient
                colors={[colors.brandPurple, colors.brandPink]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                <Ionicons name="ticket" size={20} color={colors.textPrimary} />
                <Text style={styles.buttonText}>Get Tickets</Text>
              </LinearGradient>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.secondaryButton, isInterested && styles.interestedActive]}
            onPress={onInterestedPress}
          >
            <Ionicons
              name={isInterested ? 'heart' : 'heart-outline'}
              size={20}
              color={isInterested ? colors.error : colors.textSecondary}
            />
            <Text style={[styles.secondaryText, isInterested && styles.interestedText]}>
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
    paddingTop: 20,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loggedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  loggedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.success,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  interestedActive: {
    borderColor: colors.error,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  interestedText: {
    color: colors.error,
  },
});



