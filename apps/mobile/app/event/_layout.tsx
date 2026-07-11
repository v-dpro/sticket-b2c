import { Stack } from 'expo-router';

import { useTheme } from '../../lib/theme-context';

export default function EventLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: tokens.colors.ink },
        headerTitleStyle: { color: tokens.colors.textHi },
        headerTintColor: tokens.colors.textHi,
        contentStyle: { backgroundColor: tokens.colors.ink },
      }}
    />
  );
}



