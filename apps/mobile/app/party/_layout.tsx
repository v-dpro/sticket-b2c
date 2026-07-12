import { Stack } from 'expo-router';

import { useTheme } from '../../lib/theme-context';

export default function PartyLayout() {
  const { tokens } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.bg },
      }}
    />
  );
}
