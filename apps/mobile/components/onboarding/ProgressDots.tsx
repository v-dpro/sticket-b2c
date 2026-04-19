import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../lib/theme';

interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          style={[styles.dot, index <= current ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.brandPurple,
  },
  dotInactive: {
    backgroundColor: colors.hairline,
  },
});



