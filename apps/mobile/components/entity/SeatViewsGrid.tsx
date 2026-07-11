// SeatViewsGrid — 2-column grid of seat-view photos with section/row
// labels (existing GET /venues/:id/seat-views). The API carries no
// per-view star rating, so none is shown.

import React from 'react';
import { Image, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { SeatView } from '../../types/venue';
import { durations } from '../../lib/motion';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export function SeatViewsGrid({ seatViews }: { seatViews: SeatView[] }) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
    cell: { width: '50%', padding: 5 },
    photo: {
      width: '100%',
      aspectRatio: 4 / 3,
      borderRadius: t.radius.md,
      backgroundColor: t.colors.card2,
    },
    seat: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 10.5,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      color: t.colors.text,
      marginTop: 7,
    },
    byline: { fontSize: 11.5, color: t.colors.mute, marginTop: 2 },
    empty: {
      alignItems: 'center',
      paddingVertical: 36,
      gap: 10,
    },
    emptyTitle: { fontSize: 15, fontWeight: '600', color: t.colors.fg, textAlign: 'center' },
    emptyBody: {
      fontSize: 13,
      color: t.colors.mute,
      textAlign: 'center',
      lineHeight: 19,
      maxWidth: 260,
    },
  }));

  if (seatViews.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="camera-outline" size={32} color={tokens.colors.muteSoft} />
        <Text style={styles.emptyTitle}>No seat views yet</Text>
        <Text style={styles.emptyBody}>
          Snap the view from your seat when you log a show — future fans will thank you.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {seatViews.map((view, i) => (
        <Animated.View
          key={view.id}
          entering={FadeInDown.delay(Math.min(i, 8) * durations.stagger).duration(240)}
          style={styles.cell}
        >
          <Image
            source={{ uri: view.thumbnailUrl ?? view.photoUrl }}
            accessibilityLabel={`View from section ${view.section}${view.row ? `, row ${view.row}` : ''}`}
            style={styles.photo}
          />
          <Text style={styles.seat} numberOfLines={1}>
            SEC {view.section}
            {view.row ? ` · ROW ${view.row}` : ''}
          </Text>
          <Text style={styles.byline} numberOfLines={1}>
            @{view.user.username}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}
