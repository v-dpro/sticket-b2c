import React from 'react';
import { Pressable, ScrollView, Text } from 'react-native';

import { useThemedStyles } from '../../lib/theme-context';

interface YearFilterProps {
  years: number[];
  selectedYear: number | null;
  onSelect: (year: number | null) => void;
}

export function YearFilter({ years, selectedYear, onSelect }: YearFilterProps) {
  const styles = useThemedStyles((t) => ({
    container: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    chip: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: t.colors.surface,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    chipSelected: {
      backgroundColor: t.colors.inverseBg,
      borderColor: t.colors.inverseBg,
    },
    chipText: {
      fontSize: 14,
      color: t.colors.textMid,
    },
    chipTextSelected: {
      color: t.colors.onAccent, // text on accent-filled chip
      fontWeight: '500',
    },
  }));

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
