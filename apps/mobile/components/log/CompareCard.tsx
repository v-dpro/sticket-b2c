// CompareCard — one side of the "Which night wins?" duel. Tapping a card
// picks it as the winner (spring press + medium haptic). TONIGHT wears an
// accent mono tag; a placed opponent shows its score in mono.

import { Image, Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type CompareCardProps = {
  /** Card headline: event name. */
  title: string;
  /** Mute second line: "Venue · City" or "Venue · 2024". */
  subtitle?: string;
  /** Mono tag at the top — "TONIGHT" gets accent treatment. */
  tag: string;
  tonight?: boolean;
  /** Opponent's placed score (one decimal), mono. Omitted for TONIGHT. */
  score?: number;
  photo?: string;
  disabled?: boolean;
  onPress: () => void;
};

export function CompareCard({
  title,
  subtitle,
  tag,
  tonight = false,
  score,
  photo,
  disabled = false,
  onPress,
}: CompareCardProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <SpringPressable
      onPress={onPress}
      disabled={disabled}
      shakeWhenDisabled={false}
      haptic="medium"
      pressScale={0.96}
      accessibilityRole="button"
      accessibilityLabel={tonight ? `Tonight: ${title}` : `${title}, scored ${score?.toFixed(1) ?? ''}`}
      style={{
        width: '100%',
        aspectRatio: 0.74,
        backgroundColor: c.card,
        borderRadius: tokens.radius.xl,
        borderWidth: 1,
        borderColor: tonight ? c.line : c.hairline,
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: tonight ? c.accent : c.mute,
          }}
        >
          {tag}
        </Text>
        {photo ? (
          <Image
            source={{ uri: photo }}
            style={{ width: 32, height: 32, borderRadius: tokens.radius.sm, backgroundColor: c.card2 }}
          />
        ) : null}
      </View>

      <View style={{ gap: 4 }}>
        <Text style={{ color: c.fg, fontSize: 17, fontWeight: '800', lineHeight: 22 }} numberOfLines={3}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: c.mute, fontSize: 12.5, fontWeight: '400' }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={{ minHeight: 26, justifyContent: 'flex-end' }}>
        {typeof score === 'number' ? (
          <Text
            style={{
              fontFamily: tokens.fontFamilies.monoBold,
              fontVariant: ['tabular-nums'],
              fontSize: 22,
              fontWeight: '800',
              color: c.fg,
            }}
          >
            {score.toFixed(1)}
          </Text>
        ) : (
          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontSize: 10,
              fontWeight: '600',
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              color: c.muteSoft,
            }}
          >
            Unscored
          </Text>
        )}
      </View>
    </SpringPressable>
  );
}
