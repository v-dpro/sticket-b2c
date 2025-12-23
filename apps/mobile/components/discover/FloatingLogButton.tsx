import { Pressable, StyleSheet, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors, gradients, spacing } from '../../lib/theme';

export function FloatingLogButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Log a show"
      onPress={() => router.push('/log/search')}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <LinearGradient colors={gradients.rainbow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>
        <Ionicons name="add" size={20} color={colors.textPrimary} />
        <Text style={styles.text}>Log a Show</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 92, // above tab bar
    shadowColor: colors.brandPurple,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  gradient: {
    height: 52,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  text: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
});




