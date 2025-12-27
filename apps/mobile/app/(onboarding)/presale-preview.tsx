import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';

import { radius, spacing, colors } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { apiClient } from '../../lib/api/client';
import { StatusPill } from '../../components/shared/StatusPill';
import { CodeDisplay } from '../../components/shared/CodeDisplay';
import { SignupWarning } from '../../components/shared/SignupWarning';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

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
  const goBack = useSafeBack();
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
          <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
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
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepText}>Step 4 of 6</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brandPurple} />
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
            <Ionicons name="ticket-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No presales right now</Text>
            <Text style={styles.emptyText}>We'll notify you when your artists announce shows</Text>
          </View>
        )}

        {error ? <Text style={{ color: colors.textTertiary, marginTop: 8 }}>{error}</Text> : null}
      </View>

      <View style={styles.footer}>
        {presales.length > 0 ? (
          <Pressable style={[styles.notifyButton, saving && { opacity: 0.6 }]} onPress={handleEnableNotifications} disabled={saving} accessibilityRole="button">
            <Ionicons name="notifications" size={20} color={colors.textPrimary} />
            <Text style={styles.notifyButtonText}>{saving ? 'Saving…' : 'Notify me for these presales'}</Text>
          </Pressable>
        ) : null}

        <Pressable style={styles.skipButton} onPress={handleContinue} disabled={saving} accessibilityRole="button">
          <Text style={styles.skipButtonText}>{presales.length > 0 ? 'Skip for now' : saving ? 'Saving…' : 'Continue'}</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textTertiary,
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  presaleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presaleHeader: {
    marginBottom: spacing.sm,
  },
  presaleArtist: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  presaleTour: {
    fontSize: 13,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
  },
  presaleDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  presaleTime: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brandCyan,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
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
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandPurple,
    paddingVertical: 16,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  notifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
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
    color: colors.textSecondary,
  },
});


