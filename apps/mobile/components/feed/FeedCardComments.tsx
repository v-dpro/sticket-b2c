import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FeedComment } from '../../types/feed';
import { colors } from '../../lib/theme';
import { Avatar } from '../ui/Avatar';

interface FeedCardCommentsProps {
  comments: FeedComment[];
  totalCount: number;
  onViewAllPress: () => void;
}

export function FeedCardComments({ comments, totalCount, onViewAllPress }: FeedCardCommentsProps) {
  return (
    <View style={styles.container}>
      {comments.slice(0, 2).map((comment) => (
        <View key={comment.id} style={styles.comment}>
          <Avatar uri={comment.user.avatarUrl} name={comment.user.displayName || comment.user.username} size={24} />
          <View style={styles.commentContent}>
            <Text style={styles.commentText}>
              <Text style={styles.username}>{comment.user.username}</Text>
              {'  '}
              {comment.text}
            </Text>
          </View>
        </View>
      ))}

      {totalCount > 2 ? (
        <Pressable onPress={onViewAllPress} accessibilityRole="button">
          <Text style={styles.viewAll}>View all {totalCount} comments</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  comment: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  commentContent: {
    flex: 1,
  },
  commentText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  username: {
    fontWeight: '800',
    color: colors.textPrimary,
  },
  viewAll: {
    fontSize: 13,
    color: colors.textTertiary,
    marginTop: 10,
  },
});



