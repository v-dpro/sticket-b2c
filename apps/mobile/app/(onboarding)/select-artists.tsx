import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { radius, spacing, colors, gradients } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useSpotifyArtists } from '../../hooks/useSpotifyArtists';
import { searchArtists } from '../../lib/api/artists';

interface ArtistOption {
  spotifyId?: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
}

export default function SelectArtistsScreen() {
  const router = useRouter();
  const spotifyConnected = useOnboardingStore((s) => s.spotifyConnected);
  const selectedArtists = useOnboardingStore((s) => s.selectedArtists);
  const toggleArtistSelection = useOnboardingStore((s) => s.toggleArtistSelection);
  const artistsStepCompleted = useOnboardingStore((s) => s.artistsStepCompleted);
  const setSelectedArtists = useOnboardingStore((s) => s.setSelectedArtists);

  const { artists: spotifyArtists, loading: spotifyLoading } = useSpotifyArtists();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ArtistOption[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchArtists(searchQuery, { limit: 20 });
        setSearchResults(
          results.map((r: any) => ({
            spotifyId: r.spotifyId,
            name: r.name,
            imageUrl: r.imageUrl,
            genres: r.genres,
          }))
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const displayArtists: ArtistOption[] = useMemo(() => {
    if (searchQuery.trim()) return searchResults;
    return spotifyArtists.map((a) => ({
      spotifyId: a.id,
      name: a.name,
      imageUrl: a.images?.[0]?.url,
      genres: a.genres,
    }));
  }, [searchQuery, searchResults, spotifyArtists]);

  const isSelected = (artist: ArtistOption) =>
    selectedArtists.some(
      (a) => (a.spotifyId && a.spotifyId === artist.spotifyId) || a.name.toLowerCase() === artist.name.toLowerCase()
    );

  const getSelectionTier = (artist: ArtistOption) =>
    selectedArtists.find(
      (a) => (a.spotifyId && a.spotifyId === artist.spotifyId) || a.name.toLowerCase() === artist.name.toLowerCase()
    )?.tier;

  const handleArtistPress = (artist: ArtistOption) => {
    toggleArtistSelection(artist, false);
  };

  const handleArtistLongPress = (artist: ArtistOption) => {
    Vibration.vibrate(50);
    toggleArtistSelection(artist, true);
  };

  const handleContinue = () => {
    // Persist current selection and advance.
    setSelectedArtists(selectedArtists as any);
    router.push('/(onboarding)/presale-preview');
  };

  const renderArtist = ({ item }: { item: ArtistOption }) => {
    const selected = isSelected(item);
    const tier = getSelectionTier(item);

    return (
      <Pressable
        style={[styles.artistCard, selected && styles.artistCardSelected, tier === 'top-tier' && styles.artistCardTopTier]}
        onPress={() => handleArtistPress(item)}
        onLongPress={() => handleArtistLongPress(item)}
        delayLongPress={300}
        accessibilityRole="button"
      >
        {selected ? (
          <View style={[styles.checkBadge, tier === 'top-tier' && styles.checkBadgeTopTier]}>
            <Ionicons name={tier === 'top-tier' ? 'star' : 'checkmark'} size={14} color={colors.textPrimary} />
          </View>
        ) : null}

        <View style={styles.avatarContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.artistImage} />
          ) : (
            <View style={[styles.artistImage, styles.artistImagePlaceholder]}>
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <Text style={[
          styles.artistName,
          (selected || tier === 'top-tier') && styles.artistNameSelected
        ]} numberOfLines={1}>
          {item.name}
        </Text>
      </Pressable>
    );
  };

  const mustSees = selectedArtists.filter((a) => a.tier === 'top-tier').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.stepText}>Step 3 of 6</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Select Your Artists</Text>
        <Text style={styles.subtitle}>
          {spotifyConnected
            ? 'We found artists you listen to! Tap to follow, long press for must-sees ⭐'
            : 'Search for artists you want to follow. Long press for must-sees ⭐'}
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists..."
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" color={colors.brandPurple} /> : (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="refresh" size={20} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedArtists.length} selected{mustSees > 0 ? ` (${mustSees} must-sees)` : ''}
          </Text>
          <Text style={styles.minText}>Minimum 3 artists</Text>
        </View>

        {spotifyLoading && !searchQuery.trim() ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.brandPurple} />
            <Text style={styles.loadingText}>Loading your artists from Spotify...</Text>
          </View>
        ) : (
          <FlatList
            data={displayArtists}
            keyExtractor={(item) => item.spotifyId || item.name}
            renderItem={renderArtist}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <Ionicons name="search" size={48} color={colors.textTertiary} />
                <Text style={styles.emptyText}>{searchQuery ? 'No artists found' : 'Search for artists to follow'}</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!artistsStepCompleted}
          style={({ pressed }) => [
            styles.continueButton,
            !artistsStepCompleted && styles.continueButtonDisabled,
            pressed && { opacity: 0.9 }
          ]}
          accessibilityRole="button"
        >
          {artistsStepCompleted ? (
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              <Text style={styles.continueButtonText}>Continue with {selectedArtists.length} artists</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
            </LinearGradient>
          ) : (
            <View style={styles.continueDisabledInner}>
              <Text style={styles.continueButtonTextDisabled}>Select at least 3 artists</Text>
            </View>
          )}
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
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brandCyan,
  },
  minText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  grid: {
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  grid: {
    paddingBottom: spacing.xl,
  },
  artistCard: {
    width: '31%',
    aspectRatio: 0.85,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  artistCardSelected: {
    borderWidth: 2,
    borderColor: colors.brandCyan,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  artistCardTopTier: {
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  artistImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  artistImagePlaceholder: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
  },
  avatarText: {
    color: colors.textTertiary,
    fontSize: 24,
    fontWeight: '900',
  },
  artistName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  artistNameSelected: {
    color: colors.textPrimary,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brandCyan,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeTopTier: {
    backgroundColor: colors.gold,
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
    paddingTop: 60,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  continueButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  continueButtonDisabled: {
    opacity: 0.5,
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  continueDisabledInner: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  continueButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textTertiary,
  },
});


