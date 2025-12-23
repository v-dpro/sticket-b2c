import { StyleSheet } from 'react-native';
import { colors, fonts, spacing, radius } from '../lib/theme';

export const commonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Text styles
  h1: {
    fontSize: fonts.h1,
    fontWeight: fonts.bold,
    color: colors.textPrimary,
  },
  h2: {
    fontSize: fonts.h2,
    fontWeight: fonts.bold,
    color: colors.textPrimary,
  },
  h3: {
    fontSize: fonts.h3,
    fontWeight: fonts.semibold,
    color: colors.textPrimary,
  },
  body: {
    fontSize: fonts.body,
    fontWeight: fonts.regular,
    color: colors.textSecondary,
  },
  bodySmall: {
    fontSize: fonts.bodySmall,
    fontWeight: fonts.regular,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: fonts.caption,
    fontWeight: fonts.regular,
    color: colors.textMuted,
  },

  // Cards
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.lg,
  },

  // Inputs
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fonts.body,
    color: colors.textPrimary,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.brandPurple,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fonts.body,
    fontWeight: fonts.semibold,
    color: colors.textPrimary,
  },
});



