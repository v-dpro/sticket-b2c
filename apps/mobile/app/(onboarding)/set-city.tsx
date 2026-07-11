// ONBOARDING · SET CITY — a clean city input. Feeds the onboarding store's
// `city` (which the app/index gate reads) and best-effort persists to the
// profile. Skip advances without setting a city.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { updateProfile } from '../../lib/api/profile';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useOnboardingStore } from '../../stores/onboardingStore';

export default function SetCityOnboarding() {
  const router = useRouter();
  const { tokens } = useTheme();
  const setCity = useOnboardingStore((s) => s.setCity);
  const existingCity = useOnboardingStore((s) => s.city);

  const [value, setValue] = useState(existingCity ?? '');
  const [focused, setFocused] = useState(false);
  const trimmed = value.trim();

  const styles = useThemedStyles((t) => ({
    safe: { flex: 1, backgroundColor: t.colors.bg },
    header: { paddingHorizontal: t.density.pad, paddingTop: 8, paddingBottom: 4 },
    body: { flex: 1, paddingHorizontal: t.density.pad, paddingTop: 28, gap: 10 },
    title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: t.colors.fg },
    subtitle: { fontSize: 15, fontWeight: '400', color: t.colors.mute, lineHeight: 21, marginBottom: 14 },
    field: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      height: 54,
      paddingHorizontal: 14,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.line,
      backgroundColor: t.colors.card,
    },
    fieldFocused: { borderColor: t.colors.accent },
    input: { flex: 1, fontSize: 16, fontWeight: '500', color: t.colors.fg, padding: 0 },
    footer: { paddingHorizontal: t.density.pad, paddingBottom: 12, gap: 10 },
  }));

  const goNext = () => router.push('/(onboarding)/connect-spotify');

  const onContinue = () => {
    if (!trimmed) return;
    setCity(trimmed);
    // Server persist is a nice-to-have; the store already unblocks the gate.
    void updateProfile({ city: trimmed }).catch(() => {});
    goNext();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <ProgressDots total={6} current={0} />
        </View>

        <View style={styles.body}>
          <Animated.Text entering={FadeInDown.duration(300)} style={styles.title}>
            Where do you catch shows?
          </Animated.Text>
          <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.subtitle}>
            We use your city to surface nearby shows and local presales.
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(120).duration(300)}
            style={[styles.field, focused && styles.fieldFocused]}
          >
            <Ionicons name="location-outline" size={20} color={tokens.colors.mute} />
            <TextInput
              style={styles.input}
              placeholder="City"
              placeholderTextColor={tokens.colors.textLo}
              selectionColor={tokens.colors.accent}
              value={value}
              onChangeText={setValue}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={onContinue}
            />
          </Animated.View>
        </View>

        <View style={styles.footer}>
          <PillButton
            title="Continue"
            size="lg"
            springFeedback
            haptic="light"
            disabled={!trimmed}
            onPress={onContinue}
          />
          <PillButton title="Skip for now" variant="ghost" size="lg" springFeedback onPress={goNext} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
