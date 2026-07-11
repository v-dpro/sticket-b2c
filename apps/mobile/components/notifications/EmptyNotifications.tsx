import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export function EmptyNotifications() {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(139, 92, 246, 0.12)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: 20,
      fontWeight: '900',
      color: t.colors.textHi,
      marginBottom: spacing.sm,
    },
    subtitle: {
      fontSize: 14,
      color: t.colors.textMid,
      textAlign: 'center',
      lineHeight: 20,
      maxWidth: 320,
    },
  }));

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="notifications-outline" size={48} color={tokens.colors.brandPurple} />
      </View>
      <Text style={styles.title}>No notifications yet</Text>
      <Text style={styles.subtitle}>
        When someone follows you, comments on your shows, or artists announce new dates, you’ll see it here.
      </Text>
    </View>
  );
}
