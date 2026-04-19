import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

const CATEGORIES = ['general', 'parking', 'food', 'seating', 'entry'] as const;

export type TipCategory = (typeof CATEGORIES)[number];

interface AddTipModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string, category: TipCategory) => Promise<boolean>;
}

export function AddTipModal({ visible, onClose, onSubmit }: AddTipModalProps) {
  const [text, setText] = useState('');
  const [category, setCategory] = useState<TipCategory>('general');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => text.trim().length >= 3 && !submitting, [text, submitting]);

  const handleSubmit = async () => {
    const clean = text.trim();
    if (clean.length < 3) return;

    setSubmitting(true);
    const ok = await onSubmit(clean, category);
    setSubmitting(false);

    if (ok) {
      setText('');
      setCategory('general');
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Add Tip</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.chipsRow}>
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <Pressable key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { marginTop: 16 }]}>Tip</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Parking, best bars, entrances, best sections…"
            placeholderTextColor={colors.textLo}
            multiline
            style={styles.input}
          />

          <Text style={styles.hint}>Keep it short and helpful.</Text>
        </View>

        <View style={styles.footer}>
          <Pressable style={[styles.submitButton, !canSubmit && styles.submitDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
            <LinearGradient
              colors={canSubmit ? [colors.brandPurple, colors.brandPink] : [colors.hairline, colors.hairline]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textHi} />
              ) : (
                <View style={styles.submitRow}>
                  <Ionicons name="send" size={18} color={colors.textHi} />
                  <Text style={styles.submitText}>Post Tip</Text>
                </View>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textMid,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textHi,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  label: {
    color: colors.textMid,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  chipActive: {
    backgroundColor: colors.brandPurple,
    borderColor: colors.brandPurple,
  },
  chipText: {
    color: colors.textMid,
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.textHi,
  },
  input: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.surface,
    color: colors.textHi,
    padding: 12,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: colors.textLo,
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  gradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textHi,
  },
});



