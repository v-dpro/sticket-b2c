import { StyleSheet, Text, View } from 'react-native';

import type { Event } from '../../types/event';
import { colors } from '../../lib/theme';
import { useAuthStore } from '../../stores/authStore';
import { useSession } from '../../hooks/useSession';
import { EventRow } from './EventRow';

type Props = {
  events: Event[];
  city?: string;
};

export function PopularSection({ events, city }: Props) {
  const session = useSession();
  const authCity = useAuthStore((s) => s.user?.city);
  const inferredCity = city || authCity || session.profile?.city || 'New York';

  if (!events.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Popular in {inferredCity}</Text>
      {events.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 140, // space for floating button above tab bar
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
});




