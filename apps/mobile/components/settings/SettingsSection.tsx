import type { PropsWithChildren } from 'react';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, fontFamilies } from '../../lib/theme';

type SettingsSectionProps = PropsWithChildren<{ title?: string }>;

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.lg,
  },
  title: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textLo,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.sm,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.monoSemi,
  },
  content: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
});



