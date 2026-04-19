import React from 'react';
import { View, StyleSheet } from 'react-native';

import { colors } from '../../lib/theme';

function SkeletonRow() {
  return (
    <View style={styles.card}>
      <View style={styles.avatar} />
      <View style={styles.info}>
        <View style={[styles.line, { width: '60%' }]} />
        <View style={[styles.line, { width: '45%', marginTop: 8 }]} />
        <View style={[styles.line, { width: '70%', marginTop: 8 }]} />
      </View>
    </View>
  );
}

export function WalletSkeleton() {
  return (
    <View style={{ paddingTop: 12 }}>
      <View style={{ marginHorizontal: 16, marginBottom: 16, height: 120, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline }} />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: colors.ink,
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  line: {
    height: 10,
    borderRadius: 6,
    backgroundColor: colors.hairline,
  },
});



