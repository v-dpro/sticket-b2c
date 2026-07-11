import { Stack } from 'expo-router';

import { useTheme } from '../../lib/theme-context';

export default function TicketsFlowLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: tokens.colors.bg },
        headerTitleStyle: { color: tokens.colors.fg },
        headerTintColor: tokens.colors.fg,
        contentStyle: { backgroundColor: tokens.colors.bg },
      }}
    />
  );
}
