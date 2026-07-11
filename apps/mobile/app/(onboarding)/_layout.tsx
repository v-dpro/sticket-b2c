import { Stack } from 'expo-router';

import { useTheme } from '../../lib/theme-context';

export default function OnboardingLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.bg },
        // Fade-through transition, 200ms — the motion contract for screens.
        animation: 'fade',
        animationDuration: 200,
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="set-city" />
      <Stack.Screen name="connect-spotify" />
      <Stack.Screen name="connect-music" />
      <Stack.Screen name="select-artists" />
      <Stack.Screen name="presale-preview" />
      <Stack.Screen name="log-first-show" />
      <Stack.Screen name="find-friends" />
      <Stack.Screen name="about-you" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="done" />
    </Stack>
  );
}
