import { Stack } from 'expo-router';

import { colors } from '../../lib/theme';

export default function HangLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink },
      }}
    />
  );
}
