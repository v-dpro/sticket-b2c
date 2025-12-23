import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

interface YearFilterProps {
  years: number[];
  selectedYear: number | null;
  onSelect: (year: number | null) => void;
}

export function YearFilter({ years, selectedYear, onSelect }: YearFilterProps) {
  if (years.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      <Pressable style={[styles.chip, !selectedYear && styles.chipSelected]} onPress={() => onSelect(null)}>
        <Text style={[styles.chipText, !selectedYear && styles.chipTextSelected]}>All</Text>
      </Pressable>

      {years.map((year) => (
        <Pressable key={year} style={[styles.chip, selectedYear === year && styles.chipSelected]} onPress={() => onSelect(year)}>
          <Text style={[styles.chipText, selectedYear === year && styles.chipTextSelected]}>{year}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  chipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  chipText: {
    fontSize: 14,
    color: '#A0A0B8',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
});




