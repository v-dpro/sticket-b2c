import { Stack } from 'expo-router';

import { colors } from '../../lib/theme';

export default function VenueLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.ink },
        headerTitleStyle: { color: colors.textHi },
        headerTintColor: colors.textHi,
        contentStyle: { backgroundColor: colors.ink },
      }}
    />
  );
}



