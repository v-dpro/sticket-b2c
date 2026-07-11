import React from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

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
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
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
      backgroundColor: t.colors.cyan,
    },
    pillGhost: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    pillInterestedActive: {
      borderColor: t.colors.error,
      backgroundColor: 'rgba(239,68,68,0.08)',
    },
    pillText: {
      fontSize: 15,
      fontWeight: '600',
    },
  }));

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
              <Ionicons name="checkmark-circle" size={18} color={tokens.colors.success} />
              <Text style={[styles.pillText, { color: tokens.colors.success }]}>You were there!</Text>
            </>
          ) : (
            <>
              {/* ink label contrasts against the cyan accent fill in both modes */}
              <Ionicons name="add-circle" size={18} color={tokens.colors.ink} />
              <Text style={[styles.pillText, { color: tokens.colors.ink }]}>I was there</Text>
            </>
          )}
        </Pressable>
      ) : (
        <>
          {ticketUrl ? (
            <Pressable style={[styles.pillButton, styles.pillAccent]} onPress={handleBuyTickets}>
              <Ionicons name="ticket" size={18} color={tokens.colors.ink} />
              <Text style={[styles.pillText, { color: tokens.colors.ink }]}>Get Tickets</Text>
            </Pressable>
          ) : null}

          <Pressable
            style={[styles.pillButton, styles.pillGhost, isInterested && styles.pillInterestedActive]}
            onPress={onInterestedPress}
          >
            <Ionicons
              name={isInterested ? 'heart' : 'heart-outline'}
              size={18}
              color={isInterested ? tokens.colors.error : tokens.colors.textMid}
            />
            <Text style={[styles.pillText, { color: isInterested ? tokens.colors.error : tokens.colors.textMid }]}>
              {isInterested ? 'Interested' : 'Mark Interested'}
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );
}
