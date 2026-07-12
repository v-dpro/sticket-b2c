// ONBOARDING · SELECT ARTISTS — a grid of artist tiles (circle image + name;
// selected = ink-inverted ring + check). Data source is unchanged: your
// Spotify top artists, or a debounced /artists/search. Continue → presale.

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { searchArtists } from '../../lib/api/artists';
import { durations } from '../../lib/motion';
import { useTheme } from '../../lib/theme-context';
import { useSpotifyArtists } from '../../hooks/useSpotifyArtists';
import { useOnboardingStore } from '../../stores/onboardingStore';

interface ArtistOption {
  spotifyId?: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
}

const MIN_PICKS = 3;

function ArtistTile({
  artist,
  selected,
  size,
  onPress,
}: {
  artist: ArtistOption;
  selected: boolean;
  size: number;
  onPress: () => void;
}) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const initial = (artist.name.trim()[0] ?? '?').toUpperCase();

  return (
    <SpringPressable
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ width: size, alignItems: 'center', gap: 8 }}
    >
      <View style={{ width: size, height: size }}>
        {artist.imageUrl ? (
          <Image
            source={{ uri: artist.imageUrl }}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: selected ? 3 : 1,
              borderColor: selected ? c.fg : c.hairline,
            }}
          />
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: c.card2,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: selected ? 3 : 1,
              borderColor: selected ? c.fg : c.hairline,
            }}
          >
            <Text style={{ fontSize: size * 0.32, fontWeight: '700', color: c.mute }}>{initial}</Text>
          </View>
        )}

        {selected ? (
          <View
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: c.inverseBg,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: c.bg,
            }}
          >
            <Ionicons name="checkmark" size={15} color={c.inverseFg} />
          </View>
        ) : null}
      </View>

      <Text
        numberOfLines={1}
        style={{
          width: size,
          textAlign: 'center',
          fontSize: 13,
          fontWeight: selected ? '700' : '600',
          color: selected ? c.fg : c.text,
        }}
      >
        {artist.name}
      </Text>
    </SpringPressable>
  );
}

export default function SelectArtistsScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const { width } = useWindowDimensions();

  const selectedArtists = useOnboardingStore((s) => s.selectedArtists);
  const toggleArtistSelection = useOnboardingStore((s) => s.toggleArtistSelection);
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
        const results = await searchArtists(searchQuery, { limit: 21 });
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

  const count = selectedArtists.length;
  const canContinue = count >= MIN_PICKS;

  const pad = tokens.density.pad;
  const gap = 16;
  const tileSize = Math.floor((width - pad * 2 - gap * 2) / 3);

  const handleContinue = () => {
    if (!canContinue) return;
    setSelectedArtists(selectedArtists as any);
    router.push('/(onboarding)/presale-preview');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingHorizontal: pad, paddingTop: 8, paddingBottom: 4 }}>
        <ProgressDots total={6} current={2} />
      </View>

      <View style={{ paddingHorizontal: pad, paddingTop: 20, gap: 10 }}>
        <Text style={{ fontSize: 30, fontWeight: '800', letterSpacing: -0.5, color: c.fg }}>
          Who do you love?
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '400', color: c.mute, lineHeight: 21 }}>
          Pick at least {MIN_PICKS}. We use them to find your shows and presales.
        </Text>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            height: 48,
            paddingHorizontal: 14,
            marginTop: 4,
            borderRadius: tokens.radius.lg,
            borderWidth: 1,
            borderColor: c.line,
            backgroundColor: c.card,
          }}
        >
          <Ionicons name="search" size={18} color={c.mute} />
          <TextInput
            style={{ flex: 1, fontSize: 15, fontWeight: '500', color: c.fg, padding: 0 }}
            placeholder="Search artists"
            placeholderTextColor={c.textLo}
            selectionColor={c.accent}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searching ? <ActivityIndicator size="small" color={c.mute} /> : null}
        </View>

        {/* Mono counter */}
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: canContinue ? c.fg : c.mute,
            marginTop: 2,
          }}
        >
          {count} selected{canContinue ? '' : ` · ${MIN_PICKS - count} to go`}
        </Text>
      </View>

      {/* Grid */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: pad, paddingTop: 18, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {spotifyLoading && !searchQuery.trim() ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 14 }}>
            <ActivityIndicator size="large" color={c.mute} />
            <Text style={{ fontSize: 14, fontWeight: '400', color: c.mute }}>Loading your artists…</Text>
          </View>
        ) : displayArtists.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
            <Ionicons name="search" size={34} color={c.textLo} />
            <Text style={{ fontSize: 14, fontWeight: '400', color: c.mute, textAlign: 'center' }}>
              {searchQuery ? 'No artists found' : 'Search for artists to add'}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, rowGap: 22 }}>
            {displayArtists.map((artist, i) => (
              <Animated.View
                key={artist.spotifyId || artist.name}
                entering={FadeInDown.delay(Math.min(i, 12) * durations.stagger).duration(280)}
              >
                <ArtistTile
                  artist={artist}
                  selected={isSelected(artist)}
                  size={tileSize}
                  onPress={() => toggleArtistSelection(artist, false)}
                />
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={{
          paddingHorizontal: pad,
          paddingTop: 12,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: c.hairline,
        }}
      >
        <PillButton
          title={canContinue ? 'Continue' : `Pick ${MIN_PICKS - count} more`}
          size="lg"
          springFeedback
          haptic="light"
          disabled={!canContinue}
          onPress={handleContinue}
        />
      </View>
    </SafeAreaView>
  );
}
