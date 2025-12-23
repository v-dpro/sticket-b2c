import { useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import type { FeedComment, FeedItem } from '../../types/feed';
import { colors, radius } from '../../lib/theme';
import { Card } from '../ui/Card';

import { FeedCardHeader } from './FeedCardHeader';
import { FeedCardContent } from './FeedCardContent';
import { FeedCardPhotos } from './FeedCardPhotos';
import { FeedCardActions } from './FeedCardActions';
import { FeedCardComments } from './FeedCardComments';
import { CommentInput } from './CommentInput';

interface FeedCardProps {
  item: FeedItem;
  onWasThere: (logId: string, current: boolean) => Promise<boolean>;
  onComment: (logId: string, text: string) => Promise<FeedComment | null>;
  onCommentAdded: (logId: string, comment: FeedComment) => void;
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

  const handleEventPress = () => {
    router.push({ pathname: '/event/[eventId]', params: { eventId: item.event.id } });
  };

  const handleArtistPress = () => {
    router.push({ pathname: '/artist/[artistId]', params: { artistId: item.event.artist.id } });
  };

  const handleVenuePress = () => {
    router.push({ pathname: '/venue/[venueId]', params: { venueId: item.event.venue.id } });
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

  return (
    <Card style={styles.card}>
      <FeedCardHeader user={item.user} createdAt={item.createdAt} onUserPress={handleUserPress} />

      <Pressable onPress={handleCardPress} style={({ pressed }) => [pressed && { opacity: 0.95 }]}>
        <FeedCardContent
          event={item.event}
          rating={item.log.rating}
          note={item.log.note}
          onEventPress={handleEventPress}
          onArtistPress={handleArtistPress}
          onVenuePress={handleVenuePress}
        />
      </Pressable>

      {item.log.photos?.length ? <FeedCardPhotos photos={item.log.photos} onPress={handleCardPress} /> : null}

      <FeedCardActions
        wasThereCount={localWasThereCount}
        userWasThere={localWasThere}
        commentCount={item.commentCount}
        onWasTherePress={handleWasTherePress}
        onCommentPress={() => setShowCommentInput(true)}
        onSharePress={handleShare}
      />

      {item.comments?.length ? (
        <FeedCardComments comments={item.comments} totalCount={item.commentCount} onViewAllPress={handleCardPress} />
      ) : null}

      {showCommentInput ? (
        <View style={styles.commentInputWrap}>
          <CommentInput onSubmit={handleCommentSubmit} onCancel={() => setShowCommentInput(false)} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  commentInputWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});



