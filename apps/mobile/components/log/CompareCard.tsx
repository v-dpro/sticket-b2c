// CompareCard — one side of the "Which night wins?" duel. Tapping a card
// picks it as the winner (spring press + medium haptic). TONIGHT wears the
// stub treatment (2px ink border, punched side notches); the opponent stays
// a plain card whose score hides behind a footer line until the choice.

import { Text, View } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

const NOTCH = 14; // punched side-notch diameter (stub construction)

type CompareCardProps = {
  /** Card headline: event name. */
  title: string;
  /** Mute second line: "Venue · City" or "Venue · 2024". */
  subtitle?: string;
  /** Mono eyebrow at the top — "TONIGHT", or the opponent's month/year. */
  tag: string;
  tonight?: boolean;
  /** Opponent's placed score (one decimal), mono. Omitted for TONIGHT. */
  score?: number;
  /**
   * Whether the opponent's score is shown. Hidden until the user commits to a
   * choice (A7) — the slot carries the "stays hidden" footer line so the pick
   * stays a gut call; the real number flashes in during the choice-feedback fold.
   */
  revealScore?: boolean;
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
  revealScore = false,
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
      accessibilityLabel={
        tonight
          ? `Tonight: ${title}`
          : revealScore
            ? `${title}, scored ${score?.toFixed(1) ?? ''}`
            : `${title}, score hidden until you choose`
      }
      style={{
        width: '100%',
        aspectRatio: 0.74,
        backgroundColor: c.card,
        borderRadius: tonight ? tokens.radius.stub : tokens.radius.card,
        borderWidth: tonight ? 2 : 1,
        borderColor: tonight ? c.fg : c.hairline,
        padding: 16,
        justifyContent: 'space-between',
      }}
    >
      {/* Stub notches — bg-colored circles punched through the mid edges. */}
      {tonight ? (
        <>
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -NOTCH / 2,
              top: '50%',
              marginTop: -NOTCH / 2,
              width: NOTCH,
              height: NOTCH,
              borderRadius: NOTCH / 2,
              backgroundColor: c.bg,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              right: -NOTCH / 2,
              top: '50%',
              marginTop: -NOTCH / 2,
              width: NOTCH,
              height: NOTCH,
              borderRadius: NOTCH / 2,
              backgroundColor: c.bg,
            }}
          />
        </>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: tonight ? c.fg : c.mute,
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
        <Text style={{ color: c.fg, fontSize: 20, fontWeight: '800', lineHeight: 24 }} numberOfLines={3}>
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
          revealScore ? (
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
            // Hidden until the choice is made — the footer line holds the slot.
            <Text style={{ color: c.mute, fontSize: 12.5, fontWeight: '400' }} numberOfLines={3}>
              Your score stays hidden until you choose.
            </Text>
          )
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
