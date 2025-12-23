import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { FeedPhoto } from '../../types/feed';

interface FeedCardPhotosProps {
  photos: FeedPhoto[];
  onPress: () => void;
}

export function FeedCardPhotos({ photos, onPress }: FeedCardPhotosProps) {
  const displayPhotos = useMemo(() => photos.slice(0, 4), [photos]);
  const count = displayPhotos.length;
  const [width, setWidth] = useState<number>(0);

  const gap = 2;

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w && w !== width) setWidth(w);
  };

  const sizes = useMemo(() => {
    if (!width) return null;

    if (count === 1) {
      const w = width;
      return { single: { width: w, height: Math.round(w * 0.75) } };
    }

    if (count === 2) {
      const w = (width - gap) / 2;
      return { half: { width: w, height: w } };
    }

    if (count === 3) {
      const h = width * 0.65;
      const mainW = (width - gap) * 0.65;
      const sideW = width - gap - mainW;
      const sideH = (h - gap) / 2;
      return {
        three: {
          height: h,
          main: { width: mainW, height: h },
          side: { width: sideW, height: sideH },
        },
      };
    }

    // 4+
    const w = (width - gap) / 2;
    return { quarter: { width: w, height: w } };
  }, [count, width]);

  const single = sizes && 'single' in sizes ? sizes.single : undefined;
  const half = sizes && 'half' in sizes ? sizes.half : undefined;
  const three = sizes && 'three' in sizes ? sizes.three : undefined;
  const quarter = sizes && 'quarter' in sizes ? sizes.quarter : undefined;

  return (
    <Pressable style={styles.container} onPress={onPress} onLayout={onLayout} accessibilityRole="button">
      {!sizes ? null : count === 1 && single ? (
        <Image source={{ uri: displayPhotos[0]!.thumbnailUrl || displayPhotos[0]!.photoUrl }} style={[styles.image, single]} />
      ) : count === 2 && half ? (
        <View style={[styles.row, { gap }]}>
          {displayPhotos.map((p) => (
            <Image key={p.id} source={{ uri: p.thumbnailUrl || p.photoUrl }} style={[styles.image, half]} />
          ))}
        </View>
      ) : count === 3 && three ? (
        <View style={[styles.row, { gap, height: three.height }]}>
          <Image source={{ uri: displayPhotos[0]!.thumbnailUrl || displayPhotos[0]!.photoUrl }} style={[styles.image, three.main]} />
          <View style={{ gap }}>
            {displayPhotos.slice(1).map((p) => (
              <Image key={p.id} source={{ uri: p.thumbnailUrl || p.photoUrl }} style={[styles.image, three.side]} />
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.grid, { gap }]}>
          {displayPhotos.map((p) => (
            <Image key={p.id} source={{ uri: p.thumbnailUrl || p.photoUrl }} style={[styles.image, quarter]} />
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  image: {
    backgroundColor: '#252542',
  },
});



