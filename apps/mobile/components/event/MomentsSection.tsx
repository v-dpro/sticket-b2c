import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EventMoment } from '../../types/event';
import { colors, radius, fontFamilies } from '../../lib/theme';

interface MomentsSectionProps {
  moments?: EventMoment[];
  onAddMoment?: () => void;
}

const iconByType: Record<EventMoment['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  proposal: 'heart',
  guest: 'person-add',
  debut: 'sparkles',
  cover: 'musical-notes',
  acoustic: 'mic',
  custom: 'pricetag',
};

export function MomentsSection({ moments = [], onAddMoment }: MomentsSectionProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionLabel}>MOMENTS</Text>
        {onAddMoment ? (
          <Pressable onPress={onAddMoment}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {moments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={28} color={colors.textLo} />
          <Text style={styles.emptyText}>No moments yet</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {moments.map((m) => (
            <View key={m.id} style={styles.chip}>
              <Ionicons name={iconByType[m.type]} size={13} color={colors.brandCyan} />
              <Text style={styles.chipText}>{m.label}</Text>
              <Text style={styles.chipCount}>{m.count}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  sectionLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
  },
  addText: {
    fontSize: 13,
    color: colors.brandCyan,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textLo,
  },
  chips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
  },
  chipText: {
    color: colors.textMid,
    fontSize: 13,
    fontWeight: '600',
  },
  chipCount: {
    color: colors.textLo,
    fontSize: 12,
    fontWeight: '700',
  },
});
