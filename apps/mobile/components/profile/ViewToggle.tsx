import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';

import { colors, gradients } from '../../lib/theme';

export type ViewMode = 'timeline' | 'grid' | 'map' | 'stats';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const MODES: Array<{ key: ViewMode; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'timeline', label: 'Timeline', icon: 'list' },
  { key: 'grid', label: 'Grid', icon: 'grid' },
  { key: 'map', label: 'Map', icon: 'map' },
  { key: 'stats', label: 'Stats', icon: 'stats-chart' },
];

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <View style={styles.container}>
      {MODES.map((m) => {
        const active = value === m.key;
        return (
          <Pressable
            key={m.key}
            style={styles.segment}
            onPress={() => onChange(m.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {active ? (
              <LinearGradient colors={[...gradients.rainbow]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.activeBg}>
                <Ionicons name={m.icon} size={16} color={colors.textPrimary} />
                <Text style={[styles.label, styles.labelActive]}>{m.label}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveBg}>
                <Ionicons name={m.icon} size={16} color={colors.textTertiary} />
                <Text style={styles.label}>{m.label}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 6,
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  segment: {
    flex: 1,
  },
  activeBg: {
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  inactiveBg: {
    height: 36,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.surface,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  labelActive: {
    color: colors.textPrimary,
  },
});





