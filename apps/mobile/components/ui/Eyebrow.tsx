import { StyleSheet, Text, type TextStyle } from 'react-native';
import { colors, fontFamilies } from '../../lib/theme';

export function Eyebrow({ text, color = colors.brandCyan, style }: { text: string; color?: string; style?: TextStyle }) {
  return <Text style={[styles.eyebrow, { color }, style]}>{text}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
