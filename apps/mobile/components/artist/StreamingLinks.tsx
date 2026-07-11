import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../lib/theme-context';

interface StreamingLinksProps {
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

export function StreamingLinks({ spotifyUrl, appleMusicUrl }: StreamingLinksProps) {
  const styles = useThemedStyles((t) => ({
    container: {
      marginTop: 24,
      paddingHorizontal: 16,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: t.colors.textHi,
      marginBottom: 12,
    },
    row: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 14,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      borderRadius: 14,
    },
    buttonText: {
      color: t.colors.textHi,
      fontWeight: '600',
    },
  }));

  if (!spotifyUrl && !appleMusicUrl) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listen</Text>
      <View style={styles.row}>
        {spotifyUrl && (
          <Pressable style={styles.button} onPress={() => Linking.openURL(spotifyUrl)}>
            {/* Spotify brand green — fixed brand-logo color */}
            <FontAwesome name="spotify" size={18} color="#1DB954" />
            <Text style={styles.buttonText}>Spotify</Text>
          </Pressable>
        )}
        {appleMusicUrl && (
          <Pressable style={styles.button} onPress={() => Linking.openURL(appleMusicUrl)}>
            {/* Apple Music brand red — fixed brand-logo color */}
            <Ionicons name="logo-apple" size={18} color="#FC3C44" />
            <Text style={styles.buttonText}>Apple Music</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
