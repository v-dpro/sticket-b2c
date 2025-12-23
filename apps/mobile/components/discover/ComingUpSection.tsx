import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Event } from '../../types/event';
import { colors, spacing } from '../../lib/theme';
import { EventCard } from './EventCard';

type Props = {
  events: Event[];
};

export function ComingUpSection({ events }: Props) {
  if (!events.length) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coming Up</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingRight: spacing.lg,
  },
});




