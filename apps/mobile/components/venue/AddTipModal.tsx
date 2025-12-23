import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
            placeholderTextColor="#6B6B8D"
            multiline
            style={styles.input}
          />

          <Text style={styles.hint}>Keep it short and helpful.</Text>
        </View>

        <View style={styles.footer}>
          <Pressable style={[styles.submitButton, !canSubmit && styles.submitDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
            <LinearGradient
              colors={canSubmit ? ['#8B5CF6', '#E879F9'] : ['#2D2D4A', '#2D2D4A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View style={styles.submitRow}>
                  <Ionicons name="send" size={18} color="#FFFFFF" />
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
    backgroundColor: '#0A0B1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4A',
  },
  cancelText: {
    fontSize: 16,
    color: '#A0A0B8',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  label: {
    color: '#A0A0B8',
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
    backgroundColor: '#1A1A2E',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  chipActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  chipText: {
    color: '#A0A0B8',
    fontSize: 13,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  input: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    padding: 12,
    textAlignVertical: 'top',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B6B8D',
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
    color: '#FFFFFF',
  },
});



