// EntityBits — small shared primitives for the entity pages:
// section labels, chips, mono chips, stat blocks, facepiles, star rows.
// All themed via useTheme(); mono family reserved for numbers/dates/labels.

import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

// ── SectionLabel — mono uppercase eyebrow above each section ──────

export function SectionLabel({ children }: { children: string }) {
  const styles = useThemedStyles((t) => ({
    label: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 11,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: t.colors.mute,
      marginBottom: 10,
    },
  }));
  return <Text style={styles.label}>{children}</Text>;
}

// ── Chip — card2 pill, mute 600; active inverts to ink ────────────

type ChipProps = {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, active = false, onPress, style }: ChipProps) {
  const styles = useThemedStyles((t) => ({
    chip: {
      height: 32,
      paddingHorizontal: 14,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: t.colors.inverseBg },
    text: { fontSize: 13, fontWeight: '600', color: t.colors.mute },
    textActive: { color: t.colors.inverseFg },
  }));

  const content = (
    <Text style={[styles.text, active && styles.textActive]}>{label}</Text>
  );

  if (onPress) {
    return (
      <SpringPressable
        onPress={onPress}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: active }}
        style={[styles.chip, active && styles.chipActive, style]}
      >
        {content}
      </SpringPressable>
    );
  }
  return <View style={[styles.chip, active && styles.chipActive, style]}>{content}</View>;
}

// ── MonoChip — compact mono value chip (dates, scores) ────────────

export function MonoChip({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const styles = useThemedStyles((t) => ({
    chip: {
      minWidth: 54,
      alignItems: 'center',
      paddingVertical: 5,
      paddingHorizontal: 8,
      borderRadius: t.radius.sm,
      backgroundColor: t.colors.card2,
    },
    text: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10.5,
      letterSpacing: 0.5,
      color: t.colors.text,
    },
  }));
  return (
    <View style={[styles.chip, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

// ── StatBlock — mono value over a mono label (stats rows) ─────────

export function StatBlock({ value, label }: { value: string; label: string }) {
  const styles = useThemedStyles((t) => ({
    block: { flex: 1, gap: 4 },
    value: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 20,
      color: t.colors.fg,
    },
    label: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
  }));
  return (
    <View style={styles.block}>
      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ── Facepile — overlapping avatar circles + optional overflow ─────

type FacepilePerson = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export function Facepile({
  people,
  size = 28,
  max = 5,
}: {
  people: FacepilePerson[];
  size?: number;
  max?: number;
}) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const shown = people.slice(0, max);
  const overflow = people.length - shown.length;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((p, i) => (
        <View
          key={p.id}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: i === 0 ? 0 : -(size / 3),
            borderWidth: 2,
            borderColor: c.bg,
            backgroundColor: c.card2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {p.avatarUrl ? (
            <Image
              source={{ uri: p.avatarUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={80}
              cachePolicy="memory-disk"
            />
          ) : (
            <Text style={{ fontSize: size * 0.4, fontWeight: '600', color: c.mute }}>
              {(p.username?.trim()?.[0] ?? '?').toUpperCase()}
            </Text>
          )}
        </View>
      ))}
      {overflow > 0 ? (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            marginLeft: -(size / 3),
            borderWidth: 2,
            borderColor: c.bg,
            backgroundColor: c.card2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text
            style={{
              fontFamily: tokens.fontFamilies.mono,
              fontSize: size * 0.32,
              color: c.mute,
            }}
          >
            +{overflow}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ── StarRow — monochrome 5-star readout (venue ratings) ───────────

export function StarRow({ value, size = 13 }: { value: number; size?: number }) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <View
      style={{ flexDirection: 'row', gap: 2 }}
      accessibilityLabel={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const name: 'star' | 'star-half' | 'star-outline' =
          clamped >= i - 0.25 ? 'star' : clamped >= i - 0.75 ? 'star-half' : 'star-outline';
        return (
          <Ionicons
            key={i}
            name={name}
            size={size}
            color={name === 'star-outline' ? c.muteSoft : c.fg}
          />
        );
      })}
    </View>
  );
}

// ── QuietEmpty — one-line dignified empty state inside a section ──

export function QuietEmpty({ text }: { text: string }) {
  const styles = useThemedStyles((t) => ({
    text: { fontSize: 13, color: t.colors.mute, lineHeight: 19 },
  }));
  return <Text style={styles.text}>{text}</Text>;
}
