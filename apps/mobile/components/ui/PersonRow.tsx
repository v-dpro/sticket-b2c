import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { fontFamilies } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

// ── MatchPill ──────────────────────────────────────────────

function MatchPill({ score }: { score: number }) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    matchPill: {
      borderRadius: 4,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    matchPillText: {
      fontFamily: fontFamilies.monoBold,
      fontSize: 9,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
  }));
  const isHigh = score >= 85;
  return (
    <View
      style={[
        styles.matchPill,
        isHigh
          ? { backgroundColor: tokens.colors.inverseBg }
          : { backgroundColor: tokens.colors.surface, borderWidth: 1, borderColor: tokens.colors.hairline },
      ]}
    >
      <Text
        style={[
          styles.matchPillText,
          // High-match uses white on the filled accent chip.
          { color: isHigh ? tokens.colors.onAccent : tokens.colors.textLo },
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
  const { tokens } = useTheme();
  const { colors } = tokens;
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    avatarWrap: {
      marginRight: 12,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: t.colors.elevated,
    },
    avatarPlaceholder: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: t.colors.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    avatarInitial: {
      color: t.colors.textMuted,
      fontWeight: '600',
      fontSize: 14,
    },
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
      color: t.colors.textHi,
      flexShrink: 1,
    },
    kindLabel: {
      fontFamily: fontFamilies.monoMedium,
      fontSize: 9,
      fontWeight: '500',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      marginTop: 2,
    },
    actionButton: {
      borderRadius: 999,
      paddingVertical: 5,
      paddingHorizontal: 12,
    },
    actionButtonText: {
      fontFamily: fontFamilies.monoBold,
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    divider: {
      height: 1,
      backgroundColor: t.colors.hairline,
      marginLeft: 66, // avatar width + padding
    },
  }));

  // Derive kind label
  let kindText = '';
  let kindColor: string = colors.textLo;

  if (relationship === 'friend') {
    kindText = 'FOLLOWING';
    kindColor = colors.cyan;
  } else if (relationship === 'fof' && mutualName) {
    kindText = `VIA @${mutualName}`;
    kindColor = colors.textLo;
  } else if (matchScore !== undefined && matchScore >= 85) {
    kindText = 'MATCH';
    kindColor = colors.cyan;
  }

  // Derive action button style
  const getActionStyle = () => {
    if (actionPending) {
      return { bg: colors.surface, text: colors.textLo, border: colors.hairline };
    }
    if (relationship === 'friend') {
      return { bg: 'transparent', text: colors.textHi, border: colors.hairline };
    }
    // stranger default — white label on filled accent
    return { bg: colors.cyan, text: colors.onAccent, border: 'transparent' };
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
