import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { radius } from '../../lib/theme';
import { useTheme } from '../../lib/theme-context';

interface Props {
  children: React.ReactNode;
  borderWidth?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function GradientBorderCard({
  children,
  borderWidth = 2,
  borderRadius = radius.xl,
  style,
}: Props) {
  const { tokens } = useTheme();
  return (
    <LinearGradient
      colors={tokens.gradients.rainbow}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ padding: borderWidth, borderRadius }, style]}
    >
      <View style={{
        backgroundColor: tokens.colors.surface,
        borderRadius: borderRadius - borderWidth,
        overflow: 'hidden',
      }}>
        {children}
      </View>
    </LinearGradient>
  );
}
