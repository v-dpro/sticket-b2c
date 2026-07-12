import type { ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

type CardProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  elevated?: boolean;
  /** Hero image shown at top with gradient fade to background */
  heroImage?: string;
  /** Height of the hero image area (default 200) */
  heroHeight?: number;
  /** Remove border */
  noBorder?: boolean;
};

export function Card({ children, style, onPress, elevated = false, heroImage, heroHeight = 200, noBorder = false }: CardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.lg,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    noBorder: {
      borderWidth: 0,
    },
    pressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    heroContainer: {
      width: '100%',
      position: 'relative',
    },
    heroImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
    },
    heroOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '60%',
    },
  }));

  const cardStyles: StyleProp<ViewStyle>[] = [
    styles.card,
    elevated && tokens.shadows.elevated,
    noBorder && styles.noBorder,
    style,
  ];

  const content = (
    <>
      {heroImage ? (
        <View style={[styles.heroContainer, { height: heroHeight }]}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <LinearGradient
            colors={['transparent', `${tokens.colors.bg}80`, tokens.colors.bg]}
            style={styles.heroOverlay}
          />
        </View>
      ) : null}
      {children}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [cardStyles, pressed && styles.pressed]}
        onPress={onPress}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={cardStyles}>{content}</View>;
}
