// WereHereFacepile — over-photo "who also went" pile. Sits bottom-right ON
// the media (over the bottom scrim) of FeedCard v3 and the memory viewer's
// featured card: up to 3 overlapping 22pt avatars ringed in the theme bg,
// plus a mono "+N" chip when the was-there count exceeds the preview.
// Tap → WereHereSheet. Data comes inlined from the feed serializer
// (FeedItem.wasThereUsers); when absent the pile simply doesn't render.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ThemeTokens } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';
import { Avatar } from '../ui/Avatar';

export interface FacepileUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

const AVATAR = 22;
const RING = 2;
const MAX_SHOWN = 3;
const OVERLAP = -8;

interface WereHereFacepileProps {
  users: FacepileUser[];
  /** Full was-there count — drives the "+N" overflow chip. */
  totalCount: number;
  onPress: () => void;
}

export function WereHereFacepile({ users, totalCount, onPress }: WereHereFacepileProps) {
  const styles = useThemedStyles(buildStyles);

  const shown = users.slice(0, MAX_SHOWN);
  if (shown.length === 0) return null;
  const overflow = Math.max(0, totalCount - shown.length);
  const label = Math.max(totalCount, shown.length);

  return (
    <Pressable
      onPress={onPress}
      style={styles.row}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`${label} ${label === 1 ? 'person was' : 'people were'} here`}
    >
      {shown.map((u, i) => (
        <View key={u.id} style={[styles.ring, i > 0 && styles.overlap]}>
          <Avatar uri={u.avatarUrl} name={u.displayName || u.username} size={AVATAR} />
        </View>
      ))}
      {overflow > 0 ? (
        <View style={[styles.moreChip, styles.overlap]}>
          <Text style={styles.moreText}>+{overflow}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const buildStyles = (tokens: ThemeTokens) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // 2px theme-bg ring so the pile reads as a cutout over the photo.
    ring: {
      width: AVATAR + RING * 2,
      height: AVATAR + RING * 2,
      borderRadius: (AVATAR + RING * 2) / 2,
      backgroundColor: tokens.colors.bg,
      borderWidth: RING,
      borderColor: tokens.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlap: {
      marginLeft: OVERLAP,
    },
    moreChip: {
      height: AVATAR + RING * 2,
      minWidth: AVATAR + RING * 2,
      paddingHorizontal: 6,
      borderRadius: (AVATAR + RING * 2) / 2,
      backgroundColor: 'rgba(11,11,16,0.55)',
      borderWidth: RING,
      borderColor: tokens.colors.bg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    moreText: {
      fontFamily: tokens.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 10,
      letterSpacing: 0.2,
      color: '#FFFFFF',
    },
  });
