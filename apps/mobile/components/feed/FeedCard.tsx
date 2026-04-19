import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import type { FeedComment, FeedItem } from '../../types/feed';
import { accentSets, colors, fonts, radius } from '../../lib/theme';
import { CommentInput } from './CommentInput';

interface FeedCardProps {
  item: FeedItem;
  onWasThere: (logId: string, current: boolean) => Promise<boolean>;
  onComment: (logId: string, text: string) => Promise<FeedComment | null>;
  onCommentAdded: (logId: string, comment: FeedComment) => void;
}

const accent = accentSets.cyan;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function renderStars(rating?: number): string {
  if (!rating) return '';
  const filled = Math.round(rating);
  return '★'.repeat(filled) + '·'.repeat(Math.max(0, 5 - filled));
}

export function FeedCard({ item, onWasThere, onComment, onCommentAdded }: FeedCardProps) {
  const router = useRouter();
  const [showCommentInput, setShowCommentInput] = useState(false);
  const [localWasThere, setLocalWasThere] = useState(item.userWasThere);
  const [localWasThereCount, setLocalWasThereCount] = useState(item.wasThereCount);

  const handleCardPress = () => {
    router.push({ pathname: '/log/[id]', params: { id: item.log.id } });
  };

  const handleUserPress = () => {
    router.push({ pathname: '/profile/[id]', params: { id: item.user.id } });
  };

  const handleWasTherePress = async () => {
    const success = await onWasThere(item.log.id, localWasThere);
    if (success) {
      setLocalWasThere((prev) => !prev);
      setLocalWasThereCount((prev) => (localWasThere ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  const handleCommentSubmit = async (text: string) => {
    const comment = await onComment(item.log.id, text);
    if (comment) {
      onCommentAdded(item.log.id, comment);
      setShowCommentInput(false);
    }
  };

  const handleShare = async () => {
    const who = item.user.displayName || item.user.username;
    const msg = `${who} was at ${item.event.artist.name} • ${item.event.venue.name} (${item.event.venue.city})`;
    try {
      await Share.share({ message: msg });
    } catch {
      // ignore
    }
  };

  const artworkUrl = item.log.photos?.[0]?.photoUrl ?? item.event.artist.imageUrl;
  const starStr = renderStars(item.log.rating);
  const dateLine = formatDate(item.event.date) + (starStr ? ` · ${starStr}` : '');

  return (
    <View style={styles.card}>
      {/* ── User strip ── */}
      <Pressable onPress={handleUserPress} style={styles.userStrip}>
        <View style={styles.avatarWrap}>
          {item.user.avatarUrl ? (
            <Image source={{ uri: item.user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={16} color={colors.textLo} />
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username} numberOfLines={1}>
            @{item.user.username}
          </Text>
          <Text style={styles.dateLine} numberOfLines={1}>
            {dateLine}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textLo} />
      </Pressable>

      {/* ── Artwork area ── */}
      <Pressable onPress={handleCardPress} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
        <View style={styles.artworkWrap}>
          {artworkUrl ? (
            <Image source={{ uri: artworkUrl }} style={styles.artworkImage} resizeMode="cover" />
          ) : (
            <View style={[styles.artworkImage, { backgroundColor: colors.elevated }]} />
          )}
          <LinearGradient
            colors={['transparent', colors.surface]}
            locations={[0.4, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.artworkOverlay}>
            {item.event.name ? (
              <Text style={styles.tourName} numberOfLines={1}>
                {item.event.name}
              </Text>
            ) : null}
            <Text style={styles.artistName} numberOfLines={2}>
              {item.event.artist.name}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* ── Perforation divider ── */}
      <View style={styles.perforation} />

      {/* ── Bottom section ── */}
      <View style={styles.bottomSection}>
        {/* Venue row */}
        <View style={styles.venueRow}>
          <Ionicons name="location-sharp" size={12} color={colors.textLo} style={{ marginRight: 4 }} />
          <Text style={styles.venueText} numberOfLines={1}>
            {item.event.venue.name} · {item.event.venue.city}
          </Text>
        </View>

        {/* Review quote */}
        {item.log.note ? (
          <Text style={styles.reviewQuote} numberOfLines={4}>
            &ldquo;{item.log.note}&rdquo;
          </Text>
        ) : null}
      </View>

      {/* ── Action row ── */}
      <View style={styles.actionRow}>
        <Pressable onPress={handleWasTherePress} style={styles.actionItem}>
          <Ionicons
            name={localWasThere ? 'heart' : 'heart-outline'}
            size={14}
            color={localWasThere ? colors.red : colors.textMid}
          />
          <Text style={styles.actionCount}>{localWasThereCount}</Text>
        </Pressable>

        <Pressable onPress={() => setShowCommentInput(true)} style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={14} color={colors.textMid} />
          <Text style={styles.actionCount}>{item.commentCount}</Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable onPress={handleWasTherePress}>
          <Text style={styles.wasThereText}>WAS THERE TOO?</Text>
        </Pressable>
      </View>

      {/* ── Comment input ── */}
      {showCommentInput ? (
        <View style={styles.commentInputWrap}>
          <CommentInput onSubmit={handleCommentSubmit} onCancel={() => setShowCommentInput(false)} />
        </View>
      ) : null}
    </View>
  );
}

const MONO_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.hairline,
    overflow: 'hidden',
  },

  /* ── User strip ── */
  userStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avatarWrap: {
    marginRight: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarFallback: {
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    marginRight: 8,
  },
  username: {
    fontSize: 13,
    fontWeight: fonts.semibold,
    color: colors.textHi,
  },
  dateLine: {
    fontSize: 11,
    fontFamily: MONO_FONT,
    color: colors.textLo,
    letterSpacing: 0.4,
    marginTop: 1,
  },

  /* ── Artwork ── */
  artworkWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
  },
  artworkImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  artworkOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
  },
  tourName: {
    fontFamily: MONO_FONT,
    fontSize: 10,
    color: accent.hex,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 30,
    fontWeight: fonts.regular,
    letterSpacing: -0.6,
    color: colors.textHi,
    lineHeight: 30 * 1.05,
  },

  /* ── Perforation ── */
  perforation: {
    height: 1,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
    borderStyle: 'dashed',
  },

  /* ── Bottom section ── */
  bottomSection: {
    padding: 14,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  venueText: {
    fontFamily: MONO_FONT,
    fontSize: 11,
    color: colors.textMid,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flex: 1,
  },
  reviewQuote: {
    fontSize: 18,
    fontWeight: fonts.regular,
    letterSpacing: -0.2,
    color: colors.textHi,
    lineHeight: 18 * 1.3,
    fontStyle: 'italic',
    marginTop: 10,
  },

  /* ── Action row ── */
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 18,
  },
  actionCount: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    fontWeight: fonts.semibold,
    color: colors.textMid,
    marginLeft: 5,
  },
  wasThereText: {
    fontFamily: MONO_FONT,
    fontSize: 12,
    fontWeight: fonts.semibold,
    color: accent.hex,
  },

  /* ── Comment input ── */
  commentInputWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
});
