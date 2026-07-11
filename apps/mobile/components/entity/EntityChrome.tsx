// EntityChrome — floating back / share buttons shared by the entity pages.
//
// `floating` pins the row over a hero image (absolute, below the notch);
// otherwise it renders as a normal padded row at the top of the screen.

import React from 'react';
import { View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type EntityNavProps = {
  onBack: () => void;
  onShare?: () => void;
  /** Absolute-position the row over a hero image. */
  floating?: boolean;
};

export function EntityNav({ onBack, onShare, floating = false }: EntityNavProps) {
  const insets = useSafeAreaInsets();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: t.density.pad,
    },
    button: {
      width: 36,
      height: 36,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
  }));

  return (
    <View
      style={[
        styles.row,
        floating
          ? { position: 'absolute', top: insets.top + 8, left: 0, right: 0, zIndex: 10 }
          : { paddingTop: 8, paddingBottom: 4 },
      ]}
    >
      <SpringPressable
        onPress={onBack}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.button}
      >
        <Ionicons name="chevron-back" size={20} color={tokens.colors.fg} />
      </SpringPressable>
      {onShare ? (
        <SpringPressable
          onPress={onShare}
          haptic="light"
          accessibilityRole="button"
          accessibilityLabel="Share"
          style={styles.button}
        >
          <Ionicons name="share-outline" size={18} color={tokens.colors.fg} />
        </SpringPressable>
      ) : null}
    </View>
  );
}
