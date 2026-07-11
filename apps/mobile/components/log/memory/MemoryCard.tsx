// MemoryCard — the surface for one optional card in the "Make it a memory"
// step. Mono eyebrow + optional title/right slot, an optional hint line, then
// the card body. Every card is skippable, so nothing here is required.

import { type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '../../../lib/theme-context';

type MemoryCardProps = {
  /** Mono uppercase eyebrow, e.g. "PHOTOS". */
  eyebrow: string;
  /** Optional bold title under the eyebrow (e.g. the venue name). */
  title?: string;
  /** Optional one-line helper under the header. */
  hint?: string;
  /** Optional trailing header element (e.g. the XP chip). */
  right?: ReactNode;
  children: ReactNode;
};

export function MemoryCard({ eyebrow, title, hint, right, children }: MemoryCardProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View
      style={{
        backgroundColor: c.card,
        borderRadius: tokens.radius.xl,
        borderWidth: 1,
        borderColor: c.hairline,
        padding: tokens.density.cardPad,
        gap: 14,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <View style={{ flex: 1, minWidth: 0, gap: title ? 4 : 0 }}>
          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontSize: 10.5,
              fontWeight: '600',
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: c.mute,
            }}
          >
            {eyebrow}
          </Text>
          {title ? (
            <Text style={{ color: c.fg, fontSize: 17, fontWeight: '800' }} numberOfLines={1}>
              {title}
            </Text>
          ) : null}
        </View>
        {right ?? null}
      </View>

      {hint ? <Text style={{ color: c.mute, fontSize: 12.5, fontWeight: '400' }}>{hint}</Text> : null}

      {children}
    </View>
  );
}
