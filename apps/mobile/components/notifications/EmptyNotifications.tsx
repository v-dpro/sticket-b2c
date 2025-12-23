import { Text, View, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius, spacing } from '../../lib/theme';

export function EmptyNotifications() {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="notifications-outline" size={48} color={colors.brandPurple} />
      </View>
      <Text style={styles.title}>No notifications yet</Text>
      <Text style={styles.subtitle}>
        When someone follows you, comments on your shows, or artists announce new dates, you’ll see it here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
});



