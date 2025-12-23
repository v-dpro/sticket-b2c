import { Stack } from 'expo-router';

import { colors } from '../../lib/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="set-city" />
      <Stack.Screen name="connect-spotify" />
      <Stack.Screen name="select-artists" />
      <Stack.Screen name="presale-preview" />
      <Stack.Screen name="log-first-show" />
      <Stack.Screen name="find-friends" />
      <Stack.Screen name="done" />
    </Stack>
  );
}




