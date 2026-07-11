import { StyleSheet, Text, type TextStyle } from 'react-native';
import { fontFamilies } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

export function Eyebrow({ text, color, style }: { text: string; color?: string; style?: TextStyle }) {
  const { tokens } = useTheme();
  return <Text style={[styles.eyebrow, { color: color ?? tokens.colors.brandCyan }, style]}>{text}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
