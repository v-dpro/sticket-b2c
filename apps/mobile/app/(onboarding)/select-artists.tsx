import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Vibration,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, accentSets, spacing, radius, fontFamilies } from '../../lib/theme';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useSpotifyArtists } from '../../hooks/useSpotifyArtists';
import { searchArtists } from '../../lib/api/artists';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

interface ArtistOption {
  spotifyId?: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
}

/* ── Chip with shake-pop on select ── */
function ArtistChip({
  artist,
  selected,
  onPress,
}: {
  artist: ArtistOption;
  selected: boolean;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateXAnim = useRef(new Animated.Value(0)).current;
  const prevSelected = useRef(selected);

  useEffect(() => {
    if (selected && !prevSelected.current) {
      // shake-pop: quick scale bump + tiny horizontal shake
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.12,
            duration: 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            stiffness: 300,
            damping: 15,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(translateXAnim, { toValue: 4, duration: 40, useNativeDriver: true }),
          Animated.timing(translateXAnim, { toValue: -4, duration: 40, useNativeDriver: true }),
          Animated.timing(translateXAnim, { toValue: 3, duration: 40, useNativeDriver: true }),
          Animated.timing(translateXAnim, { toValue: -3, duration: 40, useNativeDriver: true }),
          Animated.timing(translateXAnim, { toValue: 0, duration: 30, useNativeDriver: true }),
        ]),
      ]).start();
    }
    prevSelected.current = selected;
  }, [selected]);

  return (
    <Animated.View
      style={{
        transform: [{ scale: scaleAnim }, { translateX: translateXAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
        accessibilityRole="button"
        accessibilityState={{ selected }}
      >
        {selected && (
          <Ionicons name="checkmark" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
        )}
        <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextUnselected]}>
          {artist.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function SelectArtistsScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
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
          })),
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
      (a) =>
        (a.spotifyId && a.spotifyId === artist.spotifyId) ||
        a.name.toLowerCase() === artist.name.toLowerCase(),
    );

  const handleArtistPress = (artist: ArtistOption) => {
    toggleArtistSelection(artist, false);
  };

  const handleContinue = () => {
    setSelectedArtists(selectedArtists as any);
    router.push('/(onboarding)/set-city');
  };

  const count = selectedArtists.length;
  const canContinue = count >= 3;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textHi} />
        </Pressable>
      </View>

      {/* Title */}
      <View style={styles.titleBlock}>
        <Text style={styles.title}>Who do you love?</Text>
        <Text style={styles.subtitle}>Pick at least 3</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textLo} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search artists..."
          placeholderTextColor={colors.textLo}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searching && <ActivityIndicator size="small" color={accentSets.cyan.hex} />}
      </View>

      {/* Counter */}
      <View style={styles.counterRow}>
        <Text style={[styles.counter, canContinue ? styles.counterActive : styles.counterInactive]}>
          {count} / 3 picked
        </Text>
      </View>

      {/* Chip grid */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.chipGrid}
        showsVerticalScrollIndicator={false}
      >
        {spotifyLoading && !searchQuery.trim() ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentSets.cyan.hex} />
            <Text style={styles.loadingText}>Loading your artists...</Text>
          </View>
        ) : displayArtists.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={36} color={colors.textLo} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No artists found' : 'Search for artists to follow'}
            </Text>
          </View>
        ) : (
          <View style={styles.chipWrap}>
            {displayArtists.map((artist) => (
              <ArtistChip
                key={artist.spotifyId || artist.name}
                artist={artist}
                selected={isSelected(artist)}
                onPress={() => handleArtistPress(artist)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.continueButton,
            canContinue ? styles.continueEnabled : styles.continueDisabled,
            pressed && canContinue && { opacity: 0.85, transform: [{ scale: 0.97 }] },
          ]}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.continueText,
              canContinue ? styles.continueTextEnabled : styles.continueTextDisabled,
            ]}
          >
            Continue &rarr;
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: 4,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: fontFamilies.displayItalic,
    fontSize: 38,
    letterSpacing: -0.8,
    color: colors.textHi,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fontFamilies.ui,
    fontSize: 14,
    color: colors.textMid,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textHi,
    padding: 0,
  },
  counterRow: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  counter: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
  },
  counterActive: {
    color: accentSets.cyan.hex,
  },
  counterInactive: {
    color: colors.textLo,
  },
  scrollArea: {
    flex: 1,
  },
  chipGrid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
  },
  chipSelected: {
    backgroundColor: accentSets.cyan.hex,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipText: {
    fontFamily: fontFamilies.uiSemi,
    fontSize: 13.5,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: colors.textHi,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMid,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMid,
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueEnabled: {
    backgroundColor: accentSets.cyan.hex,
  },
  continueDisabled: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  continueText: {
    fontFamily: fontFamilies.uiBold,
    fontSize: 15,
  },
  continueTextEnabled: {
    color: '#FFFFFF',
  },
  continueTextDisabled: {
    color: colors.textLo,
  },
});
