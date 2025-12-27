import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Screen } from '../../../components/ui/Screen';
import { colors, spacing } from '../../../lib/theme';

import { SearchInput } from '../../../components/search/SearchInput';
import { SearchTabs } from '../../../components/search/SearchTabs';
import { ArtistResult } from '../../../components/search/ArtistResult';
import { VenueResult } from '../../../components/search/VenueResult';
import { EventResult } from '../../../components/search/EventResult';
import { UserResult } from '../../../components/search/UserResult';
import { RecentSearches } from '../../../components/search/RecentSearches';
import { TrendingSection } from '../../../components/search/TrendingSection';
import { EmptySearch } from '../../../components/search/EmptySearch';

import { useSearch } from '../../../hooks/useSearch';
import { useRecentSearches } from '../../../hooks/useRecentSearches';
import { useTrending } from '../../../hooks/useTrending';
import { logSearch } from '../../../lib/api/search';
import { NotificationBellButton } from '../../../components/notifications/NotificationBellButton';
import { useSafeBack } from '../../../lib/navigation/safeNavigation';

export default function SearchTab() {
  const router = useRouter();
  const goBack = useSafeBack();

  const { query, setQuery, activeTab, changeTab, results, allResults, loading, searched, clear } = useSearch();

  const { recentSearches, addSearch, removeSearch, clearAll: clearRecentSearches } = useRecentSearches();

  const { trending } = useTrending();

  const handleResultPress = (searchQuery: string) => {
    addSearch({ query: searchQuery });
    void logSearch(searchQuery);
  };

  const handleRecentSelect = (recentQuery: string) => {
    setQuery(recentQuery);
  };

  const handleTrendingSelect = (trendingQuery: string) => {
    setQuery(trendingQuery);
  };

  const handleCancel = goBack;

  const showResults = searched && !loading;
  const showEmpty = searched && !loading && results.totalCount === 0;
  const showBrowse = !searched && !loading;

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Search', headerShown: false }} />

        <SearchInput
          value={query}
          onChangeText={setQuery}
          onClear={clear}
          onCancel={handleCancel}
          showCancel
          autoFocus
          rightAccessory={<NotificationBellButton size={22} />}
        />

        {searched && <SearchTabs activeTab={activeTab} onChangeTab={changeTab} results={allResults} />}

        {loading && (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color={colors.brandPurple} />
          </View>
        )}

        {showEmpty && <EmptySearch query={query} searched={searched} />}

        {showResults && results.totalCount > 0 && (
          <ScrollView style={styles.results} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
            {results.artists.map((artist) => (
              <ArtistResult key={artist.id} artist={artist} onPress={() => handleResultPress(query)} />
            ))}

            {results.venues.map((venue) => (
              <VenueResult key={venue.id} venue={venue} onPress={() => handleResultPress(query)} />
            ))}

            {results.events.map((event) => (
              <EventResult key={event.id} event={event} onPress={() => handleResultPress(query)} />
            ))}

            {results.users.map((user) => (
              <UserResult key={user.id} user={user} onPress={() => handleResultPress(query)} />
            ))}
          </ScrollView>
        )}

        {showBrowse && (
          <ScrollView style={styles.browse} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
            <RecentSearches searches={recentSearches} onSelect={handleRecentSelect} onRemove={removeSearch} onClearAll={clearRecentSearches} />
            <TrendingSection data={trending} onSearchSelect={handleTrendingSelect} />
          </ScrollView>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  results: {
    flex: 1,
  },
  browse: {
    flex: 1,
  },
});





