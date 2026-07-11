// PhotoGrid — 3-column crowd-memories grid on the event page.
//
// NOTE: GET /events/:id/photos does not return the owning log's id, so
// tiles are not tappable (no /log/[logId] destination to route to). When
// the API grows a logId field, wire onPressPhoto here.

import React from 'react';
import { Image, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { EventPhoto } from '../../types/event';
import { durations } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';

export function PhotoGrid({ photos }: { photos: EventPhoto[] }) {
  const { tokens } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 }}>
      {photos.map((photo, i) => (
        <Animated.View
          key={photo.id}
          entering={FadeInDown.delay(Math.min(i, 8) * durations.stagger).duration(240)}
          style={{ width: '33.333%', padding: 2 }}
        >
          <Image
            source={{ uri: photo.thumbnailUrl ?? photo.photoUrl }}
            accessibilityLabel={`Photo by ${photo.user?.username ?? 'a fan'}`}
            style={{
              width: '100%',
              aspectRatio: 1,
              borderRadius: tokens.radius.sm,
              backgroundColor: tokens.colors.card2,
            }}
          />
        </Animated.View>
      ))}
    </View>
  );
}
