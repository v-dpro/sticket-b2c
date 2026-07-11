// VibeCard — first-ever-log scoring: one of three big "How was it?" picks.

import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type VibeCardProps = {
  emoji: string;
  label: string;
  description: string;
  disabled?: boolean;
  onPress: () => void;
};

export function VibeCard({ emoji, label, description, disabled = false, onPress }: VibeCardProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <SpringPressable
      onPress={onPress}
      disabled={disabled}
      shakeWhenDisabled={false}
      haptic="medium"
      pressScale={0.97}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${description}`}
      style={{
        backgroundColor: c.card,
        borderRadius: tokens.radius.xl,
        borderWidth: 1,
        borderColor: c.hairline,
        paddingHorizontal: 20,
        paddingVertical: 22,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <Text style={{ fontSize: 30 }}>{emoji}</Text>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ color: c.fg, fontSize: 18, fontWeight: '800' }}>{label}</Text>
        <Text style={{ color: c.mute, fontSize: 13, fontWeight: '400' }}>{description}</Text>
      </View>
    </SpringPressable>
  );
}
