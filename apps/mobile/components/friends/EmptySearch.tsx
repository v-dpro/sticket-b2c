import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

type EmptySearchProps = {
  query: string;
  searched: boolean;
};

export function EmptySearch({ query, searched }: EmptySearchProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32,
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: t.colors.textHi,
      marginTop: 16,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 14,
      color: t.colors.textLo,
      marginTop: 8,
      textAlign: 'center',
      lineHeight: 20,
    },
  }));

  if (!searched) {
    return (
      <View style={styles.container}>
        <Ionicons name="search" size={48} color={tokens.colors.hairline} />
        <Text style={styles.title}>Search for friends</Text>
        <Text style={styles.subtitle}>Find people by username or display name</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name="person-outline" size={48} color={tokens.colors.hairline} />
      <Text style={styles.title} numberOfLines={2}>
        No results for &quot;{query}&quot;
      </Text>
      <Text style={styles.subtitle}>Try a different search or invite them to join Sticket</Text>
    </View>
  );
}
