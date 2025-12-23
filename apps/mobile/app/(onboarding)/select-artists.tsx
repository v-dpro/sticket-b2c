import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, Vibration } from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, spacing } from '../../lib/theme';
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
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.artistImage} />
        ) : (
          <View style={[styles.artistImage, styles.artistImagePlaceholder]}>
            <Ionicons name="person" size={24} color="#6B6B8D" />
          </View>
        )}

        <Text style={styles.artistName} numberOfLines={1}>
          {item.name}
        </Text>

        {selected ? (
          <View style={[styles.checkBadge, tier === 'top-tier' && styles.checkBadgeTopTier]}>
            <Ionicons name={tier === 'top-tier' ? 'star' : 'checkmark'} size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </Pressable>
    );
  };

  const mustSees = selectedArtists.filter((a) => a.tier === 'top-tier').length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
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
          <Ionicons name="search" size={20} color="#6B6B8D" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artists..."
            placeholderTextColor="#6B6B8D"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" color="#8B5CF6" /> : (
            <Pressable
              onPress={() => setSearchQuery('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons name="refresh" size={18} color="#6B6B8D" />
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
            <ActivityIndicator size="large" color="#8B5CF6" />
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
                <Ionicons name="search" size={48} color="#6B6B8D" />
                <Text style={styles.emptyText}>{searchQuery ? 'No artists found' : 'Search for artists to follow'}</Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, !artistsStepCompleted && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={!artistsStepCompleted}
          accessibilityRole="button"
        >
          <Text style={styles.continueButtonText}>Continue with {selectedArtists.length} artists</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
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
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 15,
    color: '#A0A0B8',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: '#FFFFFF',
  },
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D4FF',
  },
  minText: {
    fontSize: 12,
    color: '#6B6B8D',
  },
  grid: {
    paddingBottom: spacing.xl,
  },
  row: {
    justifyContent: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  artistCard: {
    width: '31%',
    aspectRatio: 0.85,
    backgroundColor: '#1A1A2E',
    borderRadius: radius.lg,
    alignItems: 'center',
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  artistCardSelected: {
    borderColor: '#00D4FF',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  artistCardTopTier: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  artistImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: spacing.xs,
  },
  artistImagePlaceholder: {
    backgroundColor: '#252542',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0A0B8',
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00D4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeTopTier: {
    backgroundColor: '#FFD700',
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
    paddingTop: 60,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: '#A0A0B8',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#2D2D4A',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  continueButtonDisabled: {
    backgroundColor: '#252542',
    opacity: 0.5,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});


