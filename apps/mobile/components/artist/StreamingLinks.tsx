import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';

interface StreamingLinksProps {
  spotifyUrl?: string;
  appleMusicUrl?: string;
}

export function StreamingLinks({ spotifyUrl, appleMusicUrl }: StreamingLinksProps) {
  if (!spotifyUrl && !appleMusicUrl) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Listen</Text>
      <View style={styles.row}>
        {spotifyUrl && (
          <Pressable style={styles.button} onPress={() => Linking.openURL(spotifyUrl)}>
            <FontAwesome name="spotify" size={18} color="#1DB954" />
            <Text style={styles.buttonText}>Spotify</Text>
          </Pressable>
        )}
        {appleMusicUrl && (
          <Pressable style={styles.button} onPress={() => Linking.openURL(appleMusicUrl)}>
            <Ionicons name="logo-apple" size={18} color="#FC3C44" />
            <Text style={styles.buttonText}>Apple Music</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D4A',
    borderRadius: 14,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});



