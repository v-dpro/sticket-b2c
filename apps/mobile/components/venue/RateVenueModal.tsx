import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { VenueRatingsSubmission } from '../../types/venue';

interface RateVenueModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (ratings: VenueRatingsSubmission) => Promise<boolean>;
  initialRatings?: VenueRatingsSubmission;
}

const RATING_CATEGORIES = [
  { key: 'sound', label: 'Sound Quality', icon: 'volume-high' },
  { key: 'sightlines', label: 'Sightlines', icon: 'eye' },
  { key: 'drinks', label: 'Drinks & Food', icon: 'beer' },
  { key: 'staff', label: 'Staff', icon: 'people' },
  { key: 'access', label: 'Accessibility', icon: 'walk' },
] as const;

export function RateVenueModal({ visible, onClose, onSubmit, initialRatings }: RateVenueModalProps) {
  const [ratings, setRatings] = useState<VenueRatingsSubmission>(initialRatings || {});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) setRatings(initialRatings || {});
  }, [visible, initialRatings]);

  const hasRatings = useMemo(() => Object.values(ratings).some((v) => v !== undefined), [ratings]);

  const handleRatingChange = (key: string, value: number) => {
    setRatings((prev) => ({
      ...prev,
      [key]: prev[key as keyof VenueRatingsSubmission] === value ? undefined : value,
    }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const success = await onSubmit(ratings);
    setSubmitting(false);
    if (success) onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Rate Venue</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          {RATING_CATEGORIES.map(({ key, label, icon }) => (
            <View key={key} style={styles.categoryRow}>
              <View style={styles.categoryHeader}>
                <Ionicons name={icon as any} size={20} color="#8B5CF6" />
                <Text style={styles.categoryLabel}>{label}</Text>
              </View>

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const current = (ratings[key as keyof VenueRatingsSubmission] || 0) as number;
                  const active = current >= star;

                  return (
                    <Pressable key={star} onPress={() => handleRatingChange(key, star)} style={styles.starButton}>
                      <Ionicons
                        name={active ? 'star' : 'star-outline'}
                        size={28}
                        color={active ? '#F59E0B' : '#6B6B8D'}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Text style={styles.hint}>Tap a star to rate, tap again to remove</Text>
        </View>

        <View style={styles.footer}>
          <Pressable
            style={[styles.submitButton, (!hasRatings || submitting) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!hasRatings || submitting}
          >
            <LinearGradient
              colors={hasRatings ? ['#8B5CF6', '#E879F9'] : ['#2D2D4A', '#2D2D4A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Submit Ratings</Text>}
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
  categoryRow: {
    marginBottom: 24,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6B6B8D',
    textAlign: 'center',
    marginTop: 16,
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
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});



