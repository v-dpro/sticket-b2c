import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme, useThemedStyles } from '../../lib/theme-context';

type ProgressBarProps = {
  progress: number; // 0 to 1
  height?: number;
  style?: ViewStyle;
  /** Use solid color instead of gradient */
  color?: string;
};

export function ProgressBar({ progress, height = 8, style, color }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    track: {
      width: '100%',
      backgroundColor: t.colors.surface,
      borderRadius: t.radius.full,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      overflow: 'hidden',
    },
    fill: {
      borderRadius: t.radius.full,
    },
  }));

  return (
    <View style={[styles.track, { height }, style]}>
      {color ? (
        <View
          style={[
            styles.fill,
            { width: `${clamped * 100}%`, backgroundColor: color, height },
          ]}
        />
      ) : (
        <LinearGradient
          colors={tokens.gradients.rainbow}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${clamped * 100}%`, height }]}
        />
      )}
    </View>
  );
}
