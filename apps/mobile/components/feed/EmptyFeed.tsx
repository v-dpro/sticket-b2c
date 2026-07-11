import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

import type { ThemeTokens } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { PillButton } from '../ui/PillButton';

interface EmptyFeedProps {
  hasNoFriends: boolean;
}

export function EmptyFeed({ hasNoFriends }: EmptyFeedProps) {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const styles = useThemedStyles(buildStyles);

  const title = hasNoFriends ? 'Find Your Concert Crew' : 'No Activity Yet';
  const subtitle = hasNoFriends
    ? 'Follow friends to see their concert activity and discover shows together.'
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
        <Ionicons
          name={hasNoFriends ? 'people-outline' : 'musical-notes-outline'}
          size={44}
          color={c.mute}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <PillButton
        title={buttonLabel}
        onPress={onPress}
        variant="primary"
        size="lg"
        springFeedback
        haptic="light"
        icon={<Ionicons name={buttonIcon as 'add'} size={18} color={c.inverseFg} />}
      />
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    iconCircle: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: tokens.colors.card2,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 22,
      fontWeight: '800',
      color: tokens.colors.fg,
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 15,
      fontWeight: '400',
      color: tokens.colors.mute,
      textAlign: 'center',
      lineHeight: 22,
      marginBottom: 24,
    },
  });
