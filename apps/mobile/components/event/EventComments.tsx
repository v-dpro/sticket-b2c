import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatDistanceToNow } from 'date-fns';

import type { EventComment } from '../../types/event';
import { useSession } from '../../hooks/useSession';

interface EventCommentsProps {
  comments: EventComment[];
  loading: boolean;
  posting: boolean;
  onAddComment: (text: string) => Promise<boolean>;
  onDeleteComment: (commentId: string) => Promise<boolean>;
  onUserPress: (userId: string) => void;
}

export function EventComments({
  comments,
  loading,
  posting,
  onAddComment,
  onDeleteComment,
  onUserPress,
}: EventCommentsProps) {
  const { user, profile } = useSession();
  const currentUser = profile
    ? {
        id: profile.userId,
        username: profile.username ?? profile.displayName ?? 'You',
        avatarUrl: profile.avatarUrl ?? undefined,
      }
    : user
      ? {
          id: user.id,
          username: user.email.split('@')[0] || 'You',
          avatarUrl: undefined,
        }
      : null;
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    const success = await onAddComment(newComment.trim());
    if (success) {
      setNewComment('');
    }
  };

  const handleDelete = (comment: EventComment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void onDeleteComment(comment.id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discussion</Text>

      {/* Comment Input */}
      <View style={styles.inputContainer}>
        {currentUser?.avatarUrl ? (
          <Image source={{ uri: currentUser.avatarUrl }} style={styles.inputAvatar} />
        ) : (
          <View style={[styles.inputAvatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{currentUser?.username?.charAt(0) || 'U'}</Text>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder={currentUser ? 'Add a comment...' : 'Log in to comment'}
          placeholderTextColor="#6B6B8D"
          value={newComment}
          onChangeText={setNewComment}
          multiline
          maxLength={500}
          editable={!!currentUser}
        />
        <Pressable
          style={[styles.sendButton, (!newComment.trim() || !currentUser) && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={!newComment.trim() || posting || !currentUser}
        >
          <Ionicons name="send" size={18} color={newComment.trim() && currentUser ? '#8B5CF6' : '#6B6B8D'} />
        </Pressable>
      </View>

      {/* Comments List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading…</Text>
        </View>
      ) : comments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
        </View>
      ) : (
        <View style={styles.commentsList}>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Pressable onPress={() => onUserPress(comment.user.id)}>
                {comment.user.avatarUrl ? (
                  <Image source={{ uri: comment.user.avatarUrl }} style={styles.commentAvatar} />
                ) : (
                  <View style={[styles.commentAvatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarTextSmall}>{comment.user.username.charAt(0)}</Text>
                  </View>
                )}
              </Pressable>

              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Pressable onPress={() => onUserPress(comment.user.id)}>
                    <Text style={styles.commentUsername}>{comment.user.displayName || comment.user.username}</Text>
                  </Pressable>
                  <Text style={styles.commentTime}>
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.text}</Text>
              </View>

              {comment.user.id === currentUser?.id ? (
                <Pressable style={styles.deleteButton} onPress={() => handleDelete(comment)}>
                  <Ionicons name="trash-outline" size={16} color="#6B6B8D" />
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  inputAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6B6B8D',
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B8D',
  },
  commentsList: {
    paddingHorizontal: 16,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  avatarTextSmall: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6B6B8D',
  },
  commentContent: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  commentTime: {
    fontSize: 11,
    color: '#6B6B8D',
  },
  commentText: {
    fontSize: 14,
    color: '#A0A0B8',
    lineHeight: 20,
  },
  deleteButton: {
    padding: 8,
  },
});



