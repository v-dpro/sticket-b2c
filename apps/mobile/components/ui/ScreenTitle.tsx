import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamilies } from '../../lib/theme';
import { Eyebrow } from './Eyebrow';

type Props = {
  eyebrow: string;
  title: string;
  eyebrowColor?: string;
  right?: React.ReactNode;
};

export function ScreenTitle({ eyebrow, title, eyebrowColor, right }: Props) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Eyebrow text={eyebrow} color={eyebrowColor} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 34,
    fontWeight: '400',
    letterSpacing: -0.8,
    color: colors.textHi,
    marginTop: 2,
    lineHeight: 38,
  },
});
