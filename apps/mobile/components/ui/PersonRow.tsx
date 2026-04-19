import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { colors, accentSets, radius } from '../../lib/theme';

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' }) as string;

// ── MatchPill ──────────────────────────────────────────────

function MatchPill({ score }: { score: number }) {
  const isHigh = score >= 85;
  return (
    <View
      style={[
        styles.matchPill,
        isHigh
          ? { backgroundColor: accentSets.cyan.hex }
          : { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hairline },
      ]}
    >
      <Text
        style={[
          styles.matchPillText,
          { color: isHigh ? '#FFFFFF' : colors.textLo },
        ]}
      >
        {score}%
      </Text>
    </View>
  );
}

// ── Types ──────────────────────────────────────────────────

export type PersonRowProps = {
  name: string;
  username: string;
  avatar?: string;
  matchScore?: number; // 0-100
  relationship: 'friend' | 'fof' | 'stranger';
  mutualName?: string; // for FoF "VIA @name"
  onPress?: () => void;
  onAction?: () => void;
  actionLabel?: string; // "MESSAGE" | "FOLLOW" | "REQUESTED"
  actionPending?: boolean;
  showDivider?: boolean;
};

// ── Component ──────────────────────────────────────────────

export function PersonRow({
  name,
  username,
  avatar,
  matchScore,
  relationship,
  mutualName,
  onPress,
  onAction,
  actionLabel,
  actionPending,
  showDivider = false,
}: PersonRowProps) {
  // Derive kind label
  let kindText = '';
  let kindColor: string = colors.textLo;

  if (relationship === 'friend') {
    kindText = 'FOLLOWING';
    kindColor = accentSets.cyan.hex;
  } else if (relationship === 'fof' && mutualName) {
    kindText = `VIA @${mutualName}`;
    kindColor = colors.textLo;
  } else if (matchScore !== undefined && matchScore >= 85) {
    kindText = 'MATCH';
    kindColor = accentSets.cyan.hex;
  }

  // Derive action button style
  const getActionStyle = () => {
    if (actionPending) {
      return { bg: colors.surface, text: colors.textLo, border: colors.hairline };
    }
    if (relationship === 'friend') {
      return { bg: 'transparent', text: colors.textHi, border: colors.hairline };
    }
    // stranger default
    return { bg: accentSets.cyan.hex, text: '#FFFFFF', border: 'transparent' };
  };

  const actionStyle = getActionStyle();
  const resolvedLabel =
    actionLabel ??
    (actionPending
      ? 'REQUESTED'
      : relationship === 'friend'
        ? 'MESSAGE'
        : '+ REQUEST');

  return (
    <View>
      <Pressable style={styles.container} onPress={onPress}>
        {/* Avatar */}
        <View style={styles.avatarWrap}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {(name?.trim()?.[0] ?? 'U').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Name section */}
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.username} numberOfLines={1}>
              @{username}
            </Text>
            {matchScore !== undefined && <MatchPill score={matchScore} />}
          </View>
          {kindText !== '' && (
            <Text style={[styles.kindLabel, { color: kindColor }]}>{kindText}</Text>
          )}
        </View>

        {/* Action button */}
        {onAction && (
          <Pressable
            style={[
              styles.actionButton,
              {
                backgroundColor: actionStyle.bg,
                borderColor: actionStyle.border,
                borderWidth: actionStyle.border === 'transparent' ? 0 : 1,
              },
            ]}
            onPress={onAction}
            disabled={actionPending}
          >
            <Text style={[styles.actionButtonText, { color: actionStyle.text }]}>
              {resolvedLabel}
            </Text>
          </Pressable>
        )}
      </Pressable>
      {showDivider && <View style={styles.divider} />}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  // Avatar
  avatarWrap: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.elevated,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  avatarInitial: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },

  // Name
  nameSection: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.textHi,
    flexShrink: 1,
  },
  kindLabel: {
    fontFamily: MONO_FONT,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 2,
  },

  // MatchPill
  matchPill: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  matchPillText: {
    fontFamily: MONO_FONT,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Action button
  actionButton: {
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.hairline,
    marginLeft: 66, // avatar width + padding
  },
});
