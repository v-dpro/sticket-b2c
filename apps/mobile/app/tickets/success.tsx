import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { PillButton } from '../../components/ui/PillButton';
import { useThemedStyles } from '../../lib/theme-context';

export default function TicketSuccess() {
  const router = useRouter();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg, paddingHorizontal: 24 },
    title: { color: t.colors.fg, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: t.colors.mute, fontSize: 16 },
  }));

  return (
    <View style={styles.screen}>
      <View style={{ flex: 1, paddingTop: 48, gap: 24, justifyContent: 'space-between' }}>
        <View style={{ gap: 8 }}>
          <Text style={styles.title}>Saved</Text>
          <Text style={styles.subtitle}>Your ticket is in Wallet.</Text>
        </View>

        <View style={{ gap: 12, paddingBottom: 24 }}>
          <PillButton title="Go to Wallet" variant="primary" size="lg" onPress={() => router.replace('/wallet')} springFeedback haptic="medium" />
          {eventId ? (
            <PillButton
              title="View show"
              variant="secondary"
              size="lg"
              onPress={() => router.replace({ pathname: '/event/[eventId]', params: { eventId: String(eventId) } })}
              springFeedback
              haptic="light"
            />
          ) : null}
          <PillButton title="Add another" variant="secondary" size="lg" onPress={() => router.replace('/tickets/search')} springFeedback haptic="light" />
        </View>
      </View>
    </View>
  );
}
