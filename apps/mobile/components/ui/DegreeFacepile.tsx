// DegreeFacepile — who-also-saw, with connection degree (C15).
// LinkedIn 1st/2nd energy, mono discipline: 1st degree (people you follow)
// wear a 2px fg ring (3px when avatars are ≥40px); 2nd degree (friends of
// friends) are ringless. Avatars overlap −8px with a 2px surface-colored
// separation ring so the pile reads on any background. Pile caps at 5;
// the overflow chip is card2-filled. One mono caption line does the
// counting — the pile itself never carries text.

import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../../lib/theme-context';

export type FacePerson = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  /** 1 = you follow them · 2 = friend-of-friend. Absent = outside 2 hops. */
  degree?: 1 | 2;
};

type DegreeFacepileProps = {
  people: FacePerson[];
  /** Total count when it exceeds the pile (drives the +N chip). */
  totalCount?: number;
  /** Avatar diameter (default 28). */
  size?: number;
  /** The color BEHIND the pile — the separation ring (default: card). */
  surfaceColor?: string;
  /** Cap on rendered avatars (default 5, per spec). */
  max?: number;
  style?: StyleProp<ViewStyle>;
};

export function DegreeFacepile({
  people,
  totalCount,
  size = 28,
  surfaceColor,
  max = 5,
  style,
}: DegreeFacepileProps) {
  const { tokens } = useTheme();
  if (people.length === 0) return null;

  const surface = surfaceColor ?? tokens.colors.card;
  const ringWidth = size >= 40 ? 3 : 2;
  // Degree-1 first — the ring should lead the pile.
  const sorted = [...people].sort((a, b) => (a.degree ?? 3) - (b.degree ?? 3));
  const shown = sorted.slice(0, max);
  const total = totalCount ?? people.length;
  const overflow = Math.max(0, total - shown.length);

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {shown.map((person, i) => {
        const isFriend = person.degree === 1;
        return (
          <View
            key={person.id}
            style={{
              width: size + 4,
              height: size + 4,
              borderRadius: (size + 4) / 2,
              marginLeft: i === 0 ? 0 : -8,
              // The 2px surface separation — reads on photos and cards alike.
              backgroundColor: surface,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: shown.length - i,
            }}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                overflow: 'hidden',
                backgroundColor: tokens.colors.card2,
                // 1st degree wears the ink ring; 2nd degree is ringless.
                borderWidth: isFriend ? ringWidth : 0,
                borderColor: isFriend ? tokens.colors.fg : 'transparent',
              }}
            >
              {person.avatarUrl ? (
                <Image
                  source={{ uri: person.avatarUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={80}
                  cachePolicy="memory-disk"
                  recyclingKey={person.id}
                />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text
                    style={{
                      fontSize: size * 0.4,
                      fontWeight: '700',
                      color: tokens.colors.mute,
                    }}
                  >
                    {(person.displayName ?? person.username).slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
      {overflow > 0 ? (
        <View
          style={{
            minWidth: size + 4,
            height: size + 4,
            borderRadius: (size + 4) / 2,
            marginLeft: -8,
            paddingHorizontal: 6,
            backgroundColor: surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              minWidth: size,
              height: size,
              borderRadius: size / 2,
              paddingHorizontal: 5,
              backgroundColor: tokens.colors.card2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontFamily: tokens.fontFamilies.mono,
                fontVariant: ['tabular-nums'],
                fontSize: Math.max(9, size * 0.34),
                fontWeight: '600',
                color: tokens.colors.mute,
              }}
            >
              +{overflow}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
