import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { colors, gradients, radius } from '../../lib/theme';

interface EmptyFeedProps {
  hasNoFriends: boolean;
}

export function EmptyFeed({ hasNoFriends }: EmptyFeedProps) {
  const router = useRouter();

  const title = hasNoFriends ? 'Find Your Concert Crew' : 'No Activity Yet';
  const subtitle = hasNoFriends
    ? "Follow friends to see their concert activity and discover shows together."
    : "When your friends log shows, they'll appear here. Be the first to share!";

  const buttonLabel = hasNoFriends ? 'Find Friends' : 'Log a Show';
  const buttonIcon = hasNoFriends ? 'person-add' : 'add';
  const onPress = () => {
    if (hasNoFriends) router.push('/(onboarding)/find-friends');
    else router.push('/log/search');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={hasNoFriends ? 'people-outline' : 'musical-notes-outline'} size={48} color={colors.brandPurple} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <Pressable style={styles.button} onPress={onPress} accessibilityRole="button">
        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradient}>
          <Ionicons name={buttonIcon as any} size={18} color={colors.textPrimary} />
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
});



