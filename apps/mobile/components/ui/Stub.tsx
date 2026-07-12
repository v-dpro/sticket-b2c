// components/ui/Stub.tsx — the SCORECARD STUB shape language (Phase C).
// One rule governs every use (C3): the stub construction — perforation,
// punched notches, ADMIT/SEC/ROW mono details — appears ONLY on things the
// user attended (logged memories, tickets). Plans, entities, and settings
// stay plain cards.
//
// The score has two bodies (C2), never both at once:
//   <BareScore>  — giant bare mono digits, ON MEDIA (photos).
//   <ScoreStamp> — rotated 2px-border stamp, on FLAT surfaces.

import React, { useMemo } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { formatScore } from '../timeline/format';
import { useTheme } from '../../lib/theme-context';

// ─── StubPerforation ───────────────────────────────────────────────
// The tear line: a dashed rule with a punched semicircle notch at each
// end. The notches "punch through" the card by painting stage-colored
// circles that hang half outside the card's bounds — pass `notchColor`
// as the color BEHIND the card (defaults to the stage bg).

type StubPerforationProps = {
  /** Color behind the card the notches punch through to (default: bg). */
  notchColor?: string;
  /** Dash color — tokens.colors.dash on flat cards; a soft white on media. */
  dashColor?: string;
  /** Notch diameter (px). */
  notchSize?: number;
  style?: StyleProp<ViewStyle>;
};

export function StubPerforation({ notchColor, dashColor, notchSize = 14, style }: StubPerforationProps) {
  const { tokens } = useTheme();
  const punch = notchColor ?? tokens.colors.bg;
  const dash = dashColor ?? tokens.colors.dash;
  const r = notchSize / 2;

  return (
    <View style={[{ height: notchSize, justifyContent: 'center' }, style]} pointerEvents="none">
      {/* Dashed rule — inset past the notches so dashes never poke through them. */}
      <View
        style={{
          marginHorizontal: r + 4,
          borderBottomWidth: 1,
          borderStyle: 'dashed',
          borderColor: dash,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: -r,
          width: notchSize,
          height: notchSize,
          borderRadius: r,
          backgroundColor: punch,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -r,
          width: notchSize,
          height: notchSize,
          borderRadius: r,
          backgroundColor: punch,
        }}
      />
    </View>
  );
}

// ─── BareScore — giant mono digits ON MEDIA ────────────────────────

type BareScoreProps = {
  score: number;
  /** Digit font size (default 34 — feed/timeline card corner). */
  size?: number;
  style?: StyleProp<TextStyle>;
};

export function BareScore({ score, size = 34, style }: BareScoreProps) {
  const { tokens } = useTheme();
  return (
    <Text
      style={[
        {
          fontFamily: tokens.fontFamilies.mono,
          fontVariant: ['tabular-nums'],
          fontSize: size,
          fontWeight: '700',
          color: '#FFFFFF',
          textShadowColor: 'rgba(11,11,16,0.45)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 8,
          letterSpacing: -0.5,
        },
        style,
      ]}
    >
      {formatScore(score)}
    </Text>
  );
}

// ─── ScoreStamp — the rotated stamp on FLAT surfaces ───────────────
// Resting pose is −3° (the landing animation, where used, settles here:
// scale 1.3→1, rot −8°→−3°, springs.stamp, medium haptic).

type ScoreStampProps = {
  score: number;
  /** Digit font size (default 15 — inline chips; the reveal goes ~88). */
  size?: number;
  /** Skip the rotation (rows where a tilt would collide with layout). */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ScoreStamp({ score, size = 15, flat = false, style }: ScoreStampProps) {
  const { tokens } = useTheme();
  const borderWidth = size >= 40 ? 3 : 2;
  return (
    <View
      style={[
        {
          borderWidth,
          borderColor: tokens.colors.fg,
          borderRadius: Math.max(8, size * 0.35),
          paddingHorizontal: Math.max(8, size * 0.5),
          paddingVertical: Math.max(2, size * 0.16),
          alignSelf: 'flex-start',
          transform: flat ? undefined : [{ rotate: '-3deg' }],
        },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: tokens.fontFamilies.mono,
          fontVariant: ['tabular-nums'],
          fontSize: size,
          fontWeight: '700',
          color: tokens.colors.fg,
          letterSpacing: -0.5,
        }}
      >
        {formatScore(score)}
      </Text>
    </View>
  );
}

// ─── StubDetailsRow — the mono ticket-details strip ────────────────
// "MSG · JUL 11 2026 · SEC 112 · ROW 8"  ·  right slot "№ 0047"/"ADMIT 01".

type StubDetailsRowProps = {
  left: string;
  right?: string | null;
  /** On media the strip sits on the photo scrim — brighter ink. */
  onMedia?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function StubDetailsRow({ left, right, onMedia = false, style }: StubDetailsRowProps) {
  const { tokens } = useTheme();
  const color = onMedia ? '#C9C9D4' : tokens.colors.muteSoft;
  const mono: TextStyle = {
    fontFamily: tokens.fontFamilies.mono,
    fontVariant: ['tabular-nums'],
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color,
  };
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
        style,
      ]}
    >
      <Text style={[mono, { flexShrink: 1 }]} numberOfLines={1}>
        {left}
      </Text>
      {right ? <Text style={mono}>{right}</Text> : null}
    </View>
  );
}

// ─── StripeField — the diagonal ticket-stock texture ───────────────
// Fills its parent (absolute) with faint 45° stripes; used behind
// photo-less stub media and the Wrapped stat strip. Pure Views — cheap,
// static, no images.

type StripeFieldProps = {
  /** Stripe ink (default: faint white in dark, faint ink in light). */
  color?: string;
  spacing?: number;
};

export function StripeField({ color, spacing = 14 }: StripeFieldProps) {
  const { tokens } = useTheme();
  const stripe = color ?? (tokens.isDark ? 'rgba(255,255,255,0.035)' : 'rgba(19,18,24,0.045)');
  // Enough rotated bars to cover any card-sized parent (drawn once).
  const bars = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
    >
      <View
        style={{
          position: 'absolute',
          top: -400,
          left: -400,
          width: 1400,
          height: 1400,
          transform: [{ rotate: '45deg' }],
        }}
      >
        {bars.map((i) => (
          <View
            key={i}
            style={{
              position: 'absolute',
              top: i * spacing * 2,
              left: 0,
              right: 0,
              height: spacing,
              backgroundColor: stripe,
            }}
          />
        ))}
      </View>
    </View>
  );
}
