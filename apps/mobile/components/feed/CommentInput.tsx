import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, radius } from '../../lib/theme';

interface CommentInputProps {
  onSubmit: (text: string) => Promise<void>;
  onCancel: () => void;
}

export function CommentInput({ onSubmit, onCancel }: CommentInputProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Add a comment..."
        placeholderTextColor={colors.textLo}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        autoFocus
      />

      <View style={styles.actions}>
        <Pressable style={styles.iconButton} onPress={onCancel} accessibilityRole="button">
          <Ionicons name="close" size={20} color={colors.textLo} />
        </Pressable>

        <Pressable
          style={[styles.submitButton, !text.trim() && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={!text.trim() || submitting}
          accessibilityRole="button"
        >
          {submitting ? <ActivityIndicator size="small" color={colors.textHi} /> : <Ionicons name="send" size={18} color={colors.textHi} />}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: colors.ink,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.textHi,
    fontSize: 14,
    maxHeight: 110,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 8,
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.brandPurple,
    justifyContent: 'center',
    alignItems: 'center',
  },
});



