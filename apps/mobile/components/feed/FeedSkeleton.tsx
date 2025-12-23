import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { colors, radius } from '../../lib/theme';

export function FeedSkeleton() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.65, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <View style={styles.container}>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={[styles.card, { opacity }]}>
          <View style={styles.header}>
            <View style={styles.avatar} />
            <View style={styles.headerText}>
              <View style={styles.nameLine} />
              <View style={styles.usernameLine} />
            </View>
          </View>

          <View style={styles.content}>
            <View style={styles.artistImage} />
            <View style={styles.contentText}>
              <View style={styles.artistLine} />
              <View style={styles.venueLine} />
              <View style={styles.dateLine} />
            </View>
          </View>

          <View style={styles.photoPlaceholder} />

          <View style={styles.actions}>
            <View style={styles.actionButton} />
            <View style={styles.actionButton} />
            <View style={styles.actionButton} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  nameLine: {
    width: 120,
    height: 14,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  usernameLine: {
    width: 80,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  artistImage: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  contentText: {
    flex: 1,
  },
  artistLine: {
    width: '70%',
    height: 16,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 8,
  },
  venueLine: {
    width: '50%',
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginBottom: 6,
  },
  dateLine: {
    width: '40%',
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 4,
  },
  photoPlaceholder: {
    height: 200,
    backgroundColor: colors.border,
    borderRadius: radius.md,
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 16,
  },
  actionButton: {
    width: 80,
    height: 24,
    backgroundColor: colors.border,
    borderRadius: 12,
  },
});



