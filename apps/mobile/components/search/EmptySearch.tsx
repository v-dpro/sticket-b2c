import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing } from '../../lib/theme';

interface EmptySearchProps {
  query: string;
  searched: boolean;
}

export function EmptySearch({ query, searched }: EmptySearchProps) {
  if (!searched) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={48} color={colors.border} />
      <Text style={styles.title}>No results for "{query}"</Text>
      <Text style={styles.subtitle}>Try different keywords or check the spelling</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});



