import { Stack } from 'expo-router';

import { useTheme } from '../../lib/theme-context';

export default function AuthLayout() {
  const { tokens } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.bg },
        animation: 'fade',
        animationDuration: 200,
      }}
    />
  );
}
