import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { EventMoment } from '../../types/event';

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
        <Text style={styles.title}>Moments</Text>
        {onAddMoment ? (
          <Pressable onPress={onAddMoment}>
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        ) : null}
      </View>

      {moments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sparkles-outline" size={32} color="#6B6B8D" />
          <Text style={styles.emptyText}>No moments yet</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {moments.map((m) => (
            <View key={m.id} style={styles.chip}>
              <Ionicons name={iconByType[m.type]} size={14} color="#00D4FF" />
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addText: {
    fontSize: 14,
    color: '#00D4FF',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    marginHorizontal: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B6B8D',
  },
  chips: {
    paddingHorizontal: 16,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    backgroundColor: '#1A1A2E',
  },
  chipText: {
    color: '#A0A0B8',
    fontSize: 13,
    fontWeight: '600',
  },
  chipCount: {
    color: '#6B6B8D',
    fontSize: 12,
    fontWeight: '700',
  },
});



