import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { radius, spacing } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { apiClient } from '../../lib/api/client';
import { StatusPill } from '../../components/shared/StatusPill';
import { CodeDisplay } from '../../components/shared/CodeDisplay';
import { SignupWarning } from '../../components/shared/SignupWarning';

interface PresalePreview {
  id: string;
  artistName: string;
  tourName?: string;
  venueName: string;
  venueCity: string;
  presaleType: string;
  presaleStart: string;
  code?: string;
  signupUrl?: string;
  signupDeadline?: string;
}

export default function PresalePreviewScreen() {
  const router = useRouter();
  const selectedArtists = useOnboardingStore((s) => s.selectedArtists);
  const markPresalePreviewShown = useOnboardingStore((s) => s.markPresalePreviewShown);
  const setNotificationPermissionAsked = useOnboardingStore((s) => s.setNotificationPermissionAsked);

  const artistNames = useMemo(() => selectedArtists.map((a) => a.name), [selectedArtists]);

  const [presales, setPresales] = useState<PresalePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresales = async () => {
      try {
        const response = await apiClient.post('/onboarding/presale-preview', { artistNames });
        setPresales(response.data.presales ?? []);
      } catch (err: any) {
        setError('Failed to load presales');
        // eslint-disable-next-line no-console
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPresales();
  }, [artistNames]);

  const persistFollowsIfNeeded = async () => {
    // Idempotent: server uses upserts.
    await apiClient.post('/users/me/artists/bulk-follow', {
      artists: selectedArtists.map((a) => ({
        spotifyId: a.spotifyId,
        name: a.name,
        imageUrl: a.imageUrl,
        genres: a.genres,
        tier: a.tier,
      })),
    });
  };

  const handleContinue = async () => {
    setSaving(true);
    try {
      await persistFollowsIfNeeded();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to bulk-follow during onboarding:', e);
      // Proceed anyway; onboarding should not hard-block on this.
    } finally {
      markPresalePreviewShown();
      setSaving(false);
      router.push('/(onboarding)/log-first-show');
    }
  };

  const handleEnableNotifications = async () => {
    // TODO: Actually request push permission (we track that we asked).
    setNotificationPermissionAsked(true);
    await handleContinue();
  };

  const renderPresale = ({ item }: { item: PresalePreview }) => {
    const startDate = new Date(item.presaleStart);

    return (
      <View style={styles.presaleCard}>
        <View style={styles.presaleHeader}>
          <Text style={styles.presaleArtist}>{item.artistName}</Text>
          {item.tourName ? <Text style={styles.presaleTour}>{item.tourName}</Text> : null}
        </View>

        <View style={styles.presaleVenue}>
          <Ionicons name="location-outline" size={14} color="#6B6B8D" />
          <Text style={styles.presaleVenueText}>
            {item.venueName}, {item.venueCity}
          </Text>
        </View>

        <View style={styles.presaleDetails}>
          <StatusPill type="presale" label={item.presaleType} />
          <Text style={styles.presaleTime}>{format(startDate, "MMM d 'at' h:mm a")}</Text>
        </View>

        {item.code ? <CodeDisplay code={item.code} /> : null}

        {item.signupDeadline ? <SignupWarning deadline={format(new Date(item.signupDeadline), 'MMM d')} /> : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.stepText}>Step 4 of 6</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.loadingText}>Finding presales for your artists...</Text>
          </View>
        ) : presales.length > 0 ? (
          <>
            <View style={styles.titleContainer}>
              <Text style={styles.emoji}>🎉</Text>
              <Text style={styles.title}>Good news!</Text>
              <Text style={styles.subtitle}>
                We found {presales.length} upcoming presale{presales.length > 1 ? 's' : ''} for your artists
              </Text>
            </View>

            <FlatList
              data={presales}
              keyExtractor={(item) => item.id}
              renderItem={renderPresale}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="ticket-outline" size={64} color="#6B6B8D" />
            <Text style={styles.emptyTitle}>No presales right now</Text>
            <Text style={styles.emptyText}>We’ll notify you when your artists announce shows</Text>
          </View>
        )}

        {error ? <Text style={{ color: '#6B6B8D', marginTop: 8 }}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        {presales.length > 0 ? (
          <Pressable style={[styles.notifyButton, saving && { opacity: 0.6 }]} onPress={handleEnableNotifications} disabled={saving} accessibilityRole="button">
            <Ionicons name="notifications" size={20} color="#FFFFFF" />
            <Text style={styles.notifyButtonText}>{saving ? 'Saving…' : 'Notify me for these presales'}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.skipButton} onPress={handleContinue} disabled={saving} accessibilityRole="button">
          <Text style={styles.skipButtonText}>{presales.length > 0 ? 'Skip for now' : saving ? 'Saving…' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#A0A0B8" />
        </Pressable>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    marginRight: spacing.md,
  },
  stepText: {
    fontSize: 14,
    color: '#6B6B8D',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: '#A0A0B8',
    textAlign: 'center',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  presaleCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  presaleHeader: {
    marginBottom: spacing.sm,
  },
  presaleArtist: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  presaleTour: {
    fontSize: 13,
    color: '#A0A0B8',
    marginTop: 2,
  },
  presaleVenue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.md,
  },
  presaleVenueText: {
    fontSize: 13,
    color: '#A0A0B8',
  },
  presaleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presaleTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00D4FF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: '#A0A0B8',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: '#A0A0B8',
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#2D2D4A',
    gap: spacing.sm,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  notifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: spacing.xs,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0A0B8',
  },
});


