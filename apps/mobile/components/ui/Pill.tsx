import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { fonts, radius, type ThemeColors } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

type PillVariant = 'cyan' | 'purple' | 'pink' | 'gold' | 'success' | 'warning' | 'outlined';

type PillProps = {
  children: string;
  variant?: PillVariant;
  style?: ViewStyle;
};

const makeVariantMap = (
  colors: ThemeColors,
): Record<PillVariant, { bg: string; border: string; text: string }> => ({
  cyan: { bg: colors.card2, border: colors.line, text: colors.fg },
  purple: { bg: colors.card2, border: colors.line, text: colors.fg },
  pink: { bg: colors.card2, border: colors.line, text: colors.fg },
  gold: { bg: 'rgba(255, 215, 0, 0.10)', border: 'rgba(255, 215, 0, 0.30)', text: colors.gold },
  success: { bg: 'rgba(34, 197, 94, 0.10)', border: 'rgba(34, 197, 94, 0.30)', text: colors.success },
  warning: { bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.30)', text: colors.warning },
  outlined: { bg: 'transparent', border: colors.hairline, text: colors.textMid },
});

export function Pill({ children, variant = 'cyan', style }: PillProps) {
  const { tokens } = useTheme();
  const v = makeVariantMap(tokens.colors)[variant];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      <Text style={[styles.text, { color: v.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fonts.caption,
    fontWeight: fonts.semibold,
  },
});
