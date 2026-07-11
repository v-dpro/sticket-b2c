// LogRow — the clean list row used across the log flow (artist results,
// event picks, recents). Leading image/icon, weight-led title, mute
// subtitle, mono trailing metadata, hairline separator.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type LogRowProps = {
  title: string;
  subtitle?: string;
  /** Right-aligned mono metadata (one or two short lines). */
  meta?: string;
  metaSub?: string;
  /** Leading 44pt visual: a photo, or an Ionicons glyph placeholder. */
  imageUrl?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Round leading image (artists) vs rounded-square (events). */
  round?: boolean;
  /** Show a trailing chevron instead of / after meta. */
  chevron?: boolean;
  /** Hairline separator below the row (default true). */
  separator?: boolean;
  onPress: () => void;
};

export function LogRow({
  title,
  subtitle,
  meta,
  metaSub,
  imageUrl,
  icon,
  round = true,
  chevron = false,
  separator = true,
  onPress,
}: LogRowProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const hasLeading = imageUrl !== undefined || icon !== undefined;

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={title}
      style={{
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        borderBottomWidth: separator ? 1 : 0,
        borderBottomColor: c.hairline,
      }}
    >
      {hasLeading ? (
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: round ? 22 : tokens.radius.md,
            backgroundColor: c.card2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name={icon ?? 'musical-notes-outline'} size={18} color={c.mute} />
          )}
        </View>
      ) : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: c.fg, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: c.mute, fontSize: 13, fontWeight: '400', marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {meta ? (
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontVariant: ['tabular-nums'],
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              color: c.mute,
            }}
          >
            {meta}
          </Text>
          {metaSub ? (
            <Text
              style={{
                fontFamily: tokens.fontFamilies.mono,
                fontVariant: ['tabular-nums'],
                fontSize: 10,
                fontWeight: '400',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: c.muteSoft,
                marginTop: 2,
              }}
            >
              {metaSub}
            </Text>
          ) : null}
        </View>
      ) : null}

      {chevron ? <Ionicons name="chevron-forward" size={16} color={c.muteSoft} /> : null}
    </SpringPressable>
  );
}
