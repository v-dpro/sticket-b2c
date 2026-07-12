// FeedSkeleton — loading placeholder for FeedCard v3 ("the post is the photo"):
// a full-bleed rounded media card (radius 22, ~300h at 340w) with a single
// quiet mono meta line beneath it. Tokenized via useThemedStyles (card2).

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

// Matches FeedCard's MEDIA_ASPECT (height/width); RN aspectRatio is width/height.
const MEDIA_ASPECT = 300 / 340;

export function FeedSkeleton() {
  const styles = useThemedStyles(buildStyles);
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [progress]);

  const pulse = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 0.8]),
  }));

  return (
    <View style={styles.container} accessibilityLabel="Loading feed">
      {[1, 2].map((i) => (
        <Animated.View key={i} style={[styles.card, pulse]}>
          {/* Full-bleed rounded media */}
          <View style={styles.media} />
          {/* Quiet meta line */}
          <View style={styles.metaRow}>
            <View style={styles.metaLeft} />
            <View style={styles.metaRight} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    container: {
      paddingTop: 8,
    },
    card: {
      marginHorizontal: 20,
      marginBottom: 22,
    },
    media: {
      width: '100%',
      aspectRatio: 1 / MEDIA_ASPECT,
      borderRadius: 22,
      backgroundColor: tokens.colors.card2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      paddingTop: 9,
    },
    metaLeft: {
      width: 92,
      height: 10,
      borderRadius: 4,
      backgroundColor: tokens.colors.card2,
    },
    metaRight: {
      width: 74,
      height: 10,
      borderRadius: 4,
      backgroundColor: tokens.colors.card2,
    },
  });
