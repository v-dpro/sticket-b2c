import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';

export default function TicketSuccess() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  return (
    <Screen>
      <View style={{ flex: 1, paddingTop: spacing['2xl'], gap: spacing.lg, justifyContent: 'space-between' }}>
        <View style={{ gap: spacing.sm }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900' }}>Saved</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Your ticket is in Wallet.</Text>
        </View>

        <View style={{ gap: spacing.md }}>
          <Button label="Go to Wallet" onPress={() => router.replace('/wallet')} />
          {eventId ? (
            <Button
              label="View show"
              variant="secondary"
              onPress={() => router.replace({ pathname: '/event/[eventId]', params: { eventId: String(eventId) } })}
            />
          ) : null}
          <Button label="Add another" variant="secondary" onPress={() => router.replace('/tickets/search')} />
        </View>
      </View>
    </Screen>
  );
}




