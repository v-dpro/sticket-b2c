import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../lib/theme';

type EmptySearchProps = {
  query: string;
  searched: boolean;
};

export function EmptySearch({ query, searched }: EmptySearchProps) {
  if (!searched) {
    return (
      <View style={styles.container}>
        <Ionicons name="search" size={48} color={colors.border} />
        <Text style={styles.title}>Search for friends</Text>
        <Text style={styles.subtitle}>Find people by username or display name</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="person-outline" size={48} color={colors.border} />
      <Text style={styles.title} numberOfLines={2}>
        No results for &quot;{query}&quot;
      </Text>
      <Text style={styles.subtitle}>Try a different search or invite them to join Sticket</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textTertiary,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});




