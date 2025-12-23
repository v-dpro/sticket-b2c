import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TierBadgeProps {
  size?: 'small' | 'medium';
}

export function TierBadge({ size = 'medium' }: TierBadgeProps) {
  const dimensions = size === 'small' ? 20 : 24;
  const iconSize = size === 'small' ? 10 : 12;

  return (
    <View style={[styles.container, { width: dimensions, height: dimensions, borderRadius: dimensions / 2 }]}>
      <Ionicons name="star" size={iconSize} color="#FFD700" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});


