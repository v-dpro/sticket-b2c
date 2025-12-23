import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface EmptyProfileProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  onCtaPress?: () => void;
}

export function EmptyProfile({ title = 'No shows yet', subtitle = 'Start logging your concert experiences!', ctaText, onCtaPress }: EmptyProfileProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="musical-notes-outline" size={64} color="#6B6B8D" />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      {ctaText && onCtaPress ? (
        <Pressable style={styles.cta} onPress={onCtaPress}>
          <Text style={styles.ctaText}>{ctaText}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 8,
    textAlign: 'center',
  },
  cta: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#8B5CF6',
  },
  ctaText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});




