import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '../../lib/theme';

export type Milestone = {
  id: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

interface MilestoneCardProps {
  milestone: Milestone;
}

export function MilestoneCard({ milestone }: MilestoneCardProps) {
  return (
    <View style={styles.wrap}>
      <LinearGradient colors={[...gradients.rainbow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons name={milestone.icon || 'sparkles'} size={18} color={colors.textPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{milestone.title}</Text>
          {milestone.subtitle ? <Text style={styles.subtitle}>{milestone.subtitle}</Text> : null}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(10, 11, 30, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
});



