import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

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
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" />
              <Text style={styles.loggedText}>You were there!</Text>
            </>
          ) : (
            <LinearGradient
              colors={['#8B5CF6', '#E879F9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.buttonText}>I was there</Text>
            </LinearGradient>
          )}
        </Pressable>
      ) : (
        <>
          {ticketUrl ? (
            <Pressable style={styles.primaryButton} onPress={handleBuyTickets}>
              <LinearGradient
                colors={['#8B5CF6', '#E879F9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradient}
              >
                <Ionicons name="ticket" size={20} color="#FFFFFF" />
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
              color={isInterested ? '#EF4444' : '#A0A0B8'}
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
    color: '#FFFFFF',
  },
  loggedButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  loggedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22C55E',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  interestedActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  secondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#A0A0B8',
  },
  interestedText: {
    color: '#EF4444',
  },
});



