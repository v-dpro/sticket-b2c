import type { PropsWithChildren } from 'react';
import React from 'react';
import { Text, View } from 'react-native';

import { useThemedStyles } from '../../lib/theme-context';

type SettingsSectionProps = PropsWithChildren<{ title?: string }>;

export function SettingsSection({ title, children }: SettingsSectionProps) {
  const styles = useThemedStyles((t) => ({
    container: {
      marginTop: t.spacing.lg,
    },
    title: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      color: t.colors.mute,
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginBottom: t.spacing.sm,
      paddingHorizontal: t.density.pad,
    },
    content: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      marginHorizontal: t.density.pad,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
  }));

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.content}>{children}</View>
    </View>
  );
}
