import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors } from '../../lib/theme';

interface FeedCardActionsProps {
  wasThereCount: number;
  userWasThere: boolean;
  commentCount: number;
  onWasTherePress: () => void;
  onCommentPress: () => void;
  onSharePress?: () => void;
}

export function FeedCardActions({
  wasThereCount,
  userWasThere,
  commentCount,
  onWasTherePress,
  onCommentPress,
  onSharePress,
}: FeedCardActionsProps) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.action} onPress={onWasTherePress} accessibilityRole="button">
        <Ionicons
          name={userWasThere ? 'checkmark-circle' : 'checkmark-circle-outline'}
          size={20}
          color={userWasThere ? colors.success : colors.textTertiary}
        />
        <Text style={[styles.actionText, userWasThere && { color: colors.success }]}>{userWasThere ? 'I was there!' : 'I was there too'}</Text>
        {wasThereCount > 0 ? <Text style={[styles.count, userWasThere && styles.countActive]}>{wasThereCount}</Text> : null}
      </Pressable>

      <Pressable style={styles.action} onPress={onCommentPress} accessibilityRole="button">
        <Ionicons name="chatbubble-outline" size={18} color={colors.textTertiary} />
        <Text style={styles.actionText}>Comment</Text>
        {commentCount > 0 ? <Text style={styles.count}>{commentCount}</Text> : null}
      </Pressable>

      <Pressable style={styles.iconOnly} onPress={onSharePress} accessibilityRole="button">
        <Ionicons name="share-outline" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 12,
    gap: 18,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconOnly: {
    marginLeft: 'auto',
  },
  actionText: {
    fontSize: 13,
    color: colors.textTertiary,
    fontWeight: '600',
  },
  count: {
    fontSize: 12,
    color: colors.textTertiary,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  countActive: {
    color: colors.success,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
});



