// ONBOARDING · LOG FIRST SHOW — enters the existing log flow (/log/search)
// and, on a logged show, the app/index gate takes over. If the user returns
// here already having logged one, advance to find-friends. "Later" ghost
// skips ahead to find-friends.

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { useOnboardingStore } from '../../stores/onboardingStore';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'time-outline', label: 'Past shows count — go as far back as you remember' },
  { icon: 'star-outline', label: 'Rate it and it joins your ranked canon' },
  { icon: 'people-outline', label: 'See who else was in the room' },
];

export default function LogFirstShowOnboarding() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { hasLoggedFirstShow } = useSession();
  const setFirstShowLogged = useOnboardingStore((s) => s.setFirstShowLogged);

  // If they already logged (e.g. returning to this step), continue.
  useEffect(() => {
    if (hasLoggedFirstShow) {
      setFirstShowLogged(true);
      router.replace('/(onboarding)/find-friends');
    }
  }, [hasLoggedFirstShow, router, setFirstShowLogged]);

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { flex: 1, paddingHorizontal: t.density.pad, paddingTop: 28, gap: 10 },
    mark: {
      width: 56,
      height: 56,
      borderRadius: t.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
      marginBottom: 8,
    },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 21, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    rowIcon: { width: 30, alignItems: 'center' },
    rowLabel: { flex: 1, fontSize: 14.5, fontWeight: '500', color: t.colors.textSoft },
    footer: { paddingHorizontal: t.density.pad, paddingBottom: 12, gap: 10 },
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <ProgressDots total={6} current={4} />
      </View>

      <View style={styles.body}>
        <Animated.View entering={FadeInDown.duration(300)} style={styles.mark}>
          <Ionicons name="ticket-outline" size={26} color={tokens.colors.fg} />
        </Animated.View>
        <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.title}>
          Add your first show
        </Animated.Text>
        <Animated.Text entering={FadeInDown.delay(100).duration(300)} style={styles.subtitle}>
          Log a show you’ve been to and your live-events timeline starts filling in.
        </Animated.Text>

        <View style={{ gap: 14, marginTop: 4 }}>
          {POINTS.map((p, i) => (
            <Animated.View
              key={p.label}
              entering={FadeInDown.delay(160 + i * durations.stagger).duration(280)}
              style={styles.row}
            >
              <View style={styles.rowIcon}>
                <Ionicons name={p.icon} size={19} color={tokens.colors.mute} />
              </View>
              <Text style={styles.rowLabel}>{p.label}</Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <Animated.View entering={FadeInDown.delay(300).duration(300)} style={styles.footer}>
        <PillButton
          title="Log a show"
          size="lg"
          springFeedback
          haptic="light"
          onPress={() => router.push('/log/search')}
        />
        <PillButton
          title="Later"
          variant="ghost"
          size="lg"
          springFeedback
          onPress={() => router.push('/(onboarding)/find-friends')}
        />
      </Animated.View>
    </SafeAreaView>
  );
}
