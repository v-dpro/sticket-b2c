// PhotoGrid — 3-column crowd-memories grid on the event page.
//
// NOTE: GET /events/:id/photos does not return the owning log's id, so
// tiles are not tappable (no /log/[logId] destination to route to). When
// the API grows a logId field, wire onPressPhoto here.

import React, { memo } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';

import type { EventPhoto } from '../../types/event';
import { durations, tearIn } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';

// Memoized: `photos` is replaced by identity on refetch — shallow compare holds.
export const PhotoGrid = memo(function PhotoGrid({ photos }: { photos: EventPhoto[] }) {
  const { tokens } = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 }}>
      {photos.map((photo, i) => (
        <Animated.View
          key={photo.id}
          entering={tearIn(Math.min(i, 8) * durations.stagger)}
          style={{ width: '33.333%', padding: 2 }}
        >
          <Image
            source={{ uri: photo.thumbnailUrl ?? photo.photoUrl }}
            accessibilityLabel={`Photo by ${photo.user?.username ?? 'a fan'}`}
            contentFit="cover"
            transition={80}
            cachePolicy="memory-disk"
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
});
