import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients, radius } from '../../lib/theme';

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
  return (
    <LinearGradient
      colors={gradients.rainbow}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ padding: borderWidth, borderRadius }, style]}
    >
      <View style={{ 
        backgroundColor: colors.surface, 
        borderRadius: borderRadius - borderWidth,
        overflow: 'hidden',
      }}>
        {children}
      </View>
    </LinearGradient>
  );
}

