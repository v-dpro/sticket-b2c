// ONBOARDING · PRIVACY — kept minimal. Not part of the app/index gate flow;
// retained as a single clean screen so the route compiles.

import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PillButton } from '../../components/ui/PillButton';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export default function PrivacyScreen() {
  const router = useRouter();
  const { tokens } = useTheme();

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    body: { flex: 1, paddingHorizontal: t.density.pad, justifyContent: 'center', gap: 12 },
    mark: {
      width: 56,
      height: 56,
      borderRadius: t.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
      marginBottom: 6,
    },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 22 },
    footer: { paddingHorizontal: t.density.pad, paddingBottom: 12, gap: 10 },
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.mark}>
          <Ionicons name="lock-closed-outline" size={24} color={tokens.colors.fg} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.title}>
          You’re in control
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.subtitle}>
          Your logs default to friends-only. You can change who sees what any time in Settings.
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.delay(160).duration(300)} style={styles.footer}>
        <PillButton
          title="Continue"
          size="lg"
          springFeedback
          haptic="light"
          onPress={() => router.push('/(onboarding)/done')}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
