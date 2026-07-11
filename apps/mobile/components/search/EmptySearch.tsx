import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface EmptySearchProps {
  query: string;
  searched: boolean;
}

export function EmptySearch({ query, searched }: EmptySearchProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
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
      color: t.colors.textHi,
      marginTop: spacing.md,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: t.colors.textLo,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
  }));

  if (!searched) return null;

  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={48} color={tokens.colors.hairline} />
      <Text style={styles.title}>No results for "{query}"</Text>
      <Text style={styles.subtitle}>Try different keywords or check the spelling</Text>
    </View>
  );
}
