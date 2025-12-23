import React, { useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useMyArtists } from '../../../hooks/useMyArtists';
import { StatusPill } from '../../../components/shared/StatusPill';
import { CodeDisplay } from '../../../components/shared/CodeDisplay';
import { SignupWarning } from '../../../components/shared/SignupWarning';
import { TierBadge } from '../../../components/shared/TierBadge';

type FilterType = 'seen' | 'unseen' | 'presale';

type ArtistRow = {
  id: string;
  tier: string;
  artist: { id: string; name: string; imageUrl?: string; genres?: string[] };
  stats: { timesSeen: number };
  upcomingPresales: Array<{ id: string; presaleType: string; presaleStart: string; code?: string; signupDeadline?: string; venueName?: string; venueCity?: string }>;
};

export default function MyArtistsScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterType>('seen');
  const { data, loading, refreshing, refresh } = useMyArtists();

  const topTier = (data?.topTier ?? []) as ArtistRow[];
  const following = (data?.following ?? []) as ArtistRow[];
  const casual = (data?.casual ?? []) as ArtistRow[];
  const bucketList = (data?.bucketList ?? []) as ArtistRow[];
  const withPresales = (data?.withPresales ?? []) as ArtistRow[];

  const totalArtists = data?.totalArtists ?? 0;
  const totalSeen = data?.totalSeen ?? 0;
  const presaleCount = withPresales.length;

  const allArtists = useMemo(() => [...topTier, ...following, ...casual], [casual, following, topTier]);

  const filteredArtists = useMemo(() => {
    if (activeFilter === 'presale') return withPresales;
    if (activeFilter === 'unseen') return bucketList;
    // seen
    return allArtists.filter((a) => (a.stats?.timesSeen ?? 0) > 0);
  }, [activeFilter, allArtists, bucketList, withPresales]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Artists</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/search')} activeOpacity={0.8}>
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/notifications')} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalArtists}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalSeen}</Text>
            <Text style={styles.statLabel}>Seen</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{presaleCount}</Text>
            <Text style={styles.statLabel}>Presales</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          {[
            { key: 'seen', label: 'Seen' },
            { key: 'unseen', label: 'Bucket List' },
            { key: 'presale', label: 'Presale' },
          ].map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.filterTab, activeFilter === key && styles.filterTabActive]}
              onPress={() => setActiveFilter(key as FilterType)}
              activeOpacity={0.85}
            >
              <Text style={[styles.filterText, activeFilter === key && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#00D4FF" />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : activeFilter === 'presale' ? (
          <View style={styles.presaleList}>
            {filteredArtists.map((artist) => (
              <PresaleArtistCard key={artist.id} artist={artist} onPress={() => router.push(`/artist/${artist.artist.id}`)} />
            ))}
            {filteredArtists.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="notifications-outline" size={48} color="#6B6B8D" />
                <Text style={styles.emptyTitle}>No active presales</Text>
                <Text style={styles.emptyText}>We’ll notify you when your artists announce presales</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.artistGrid}>
            {filteredArtists.map((artist) => (
              <ArtistCircleCard key={artist.id} artist={artist} onPress={() => router.push(`/artist/${artist.artist.id}`)} />
            ))}
            {filteredArtists.length === 0 ? (
              <View style={styles.emptyStateGrid}>
                <Ionicons
                  name={activeFilter === 'seen' ? 'checkmark-circle-outline' : 'flag-outline'}
                  size={48}
                  color="#6B6B8D"
                />
                <Text style={styles.emptyTitle}>{activeFilter === 'seen' ? 'No artists seen yet' : 'All caught up!'}</Text>
                <Text style={styles.emptyText}>
                  {activeFilter === 'seen' ? 'Start logging shows to see your artists here' : "You’ve seen all the artists you follow"}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ArtistCircleCard({ artist, onPress }: { artist: ArtistRow; onPress: () => void }) {
  const isTopTier = artist.tier === 'top-tier';
  const seenCount = artist.stats?.timesSeen ?? 0;
  const hasSeen = seenCount > 0;
  const imageUrl = artist.artist.imageUrl;

  return (
    <TouchableOpacity style={styles.circleCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.circleImageContainer}>
        <View style={[styles.circleImageWrapper, isTopTier && styles.circleBorderGold, !isTopTier && hasSeen && styles.circleBorderPurple]}>
          {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.circleImage} /> : <View style={styles.circleImageFallback} />}
        </View>

        {isTopTier ? (
          <View style={styles.topTierBadge}>
            <TierBadge size="small" />
          </View>
        ) : hasSeen ? (
          <View style={styles.seenBadge}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <Text style={styles.circleName} numberOfLines={2}>
        {artist.artist.name}
      </Text>

      {hasSeen ? <Text style={styles.circleSeenCount}>Seen {seenCount}x</Text> : <Text style={styles.circleNotSeen}>Not seen</Text>}
    </TouchableOpacity>
  );
}

function PresaleArtistCard({ artist, onPress }: { artist: ArtistRow; onPress: () => void }) {
  const isTopTier = artist.tier === 'top-tier';
  const seenCount = artist.stats?.timesSeen ?? 0;
  const hasSeen = seenCount > 0;
  const imageUrl = artist.artist.imageUrl;
  const presale = artist.upcomingPresales?.[0];
  const genre = artist.artist.genres?.[0] || 'Music';

  return (
    <TouchableOpacity style={styles.presaleCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.presaleHeader}>
        <View style={styles.presaleImageContainer}>
          <View style={[styles.presaleImageWrapper, isTopTier && styles.circleBorderGold, !isTopTier && hasSeen && styles.circleBorderPurple]}>
            {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.presaleImage} /> : <View style={styles.circleImageFallback} />}
          </View>
          {isTopTier ? (
            <View style={styles.topTierBadgeSmall}>
              <TierBadge size="small" />
            </View>
          ) : null}
        </View>

        <View style={styles.presaleInfo}>
          <Text style={styles.presaleArtistName}>{artist.artist.name}</Text>
          <View style={styles.genreBadge}>
            <Text style={styles.genreText}>{genre}</Text>
          </View>
          {hasSeen ? <Text style={styles.presaleSeenCount}>Seen {seenCount}x</Text> : null}
        </View>
      </View>

      {presale ? (
        <View style={styles.presaleDetails}>
          <StatusPill type="presale" label={presale.presaleType || 'Presale'} />

          <View style={styles.presaleRow}>
            <Ionicons name="calendar-outline" size={14} color="#A0A0B8" />
            <Text style={styles.presaleText}>
              {new Date(presale.presaleStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          {presale.venueName ? (
            <View style={styles.presaleRow}>
              <Ionicons name="location-outline" size={14} color="#A0A0B8" />
              <Text style={styles.presaleText}>
                {presale.venueName}
                {presale.venueCity ? `, ${presale.venueCity}` : ''}
              </Text>
            </View>
          ) : null}

          {presale.code ? (
            <View style={styles.presaleCodeWrapper}>
              <CodeDisplay code={presale.code} />
            </View>
          ) : null}

          {presale.signupDeadline ? (
            <SignupWarning deadline={new Date(presale.signupDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
          ) : null}
        </View>
      ) : (
        <Text style={styles.emptyPresaleText}>No presale details</Text>
      )}
    </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A0A0B8',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2D2D4A',
  },
  filterContainer: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    padding: 4,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#252542',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B6B8D',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  loadingState: {
    paddingTop: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: '#A0A0B8',
    fontWeight: '700',
  },
  artistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  presaleList: {
    gap: 16,
  },
  circleCard: {
    width: '30%',
    alignItems: 'center',
  },
  circleImageContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  circleImageWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#2D2D4A',
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
  },
  circleBorderGold: {
    borderColor: '#FFD700',
  },
  circleBorderPurple: {
    borderColor: '#8B5CF6',
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  circleImageFallback: {
    flex: 1,
    backgroundColor: '#252542',
  },
  topTierBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0A0B1E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  seenBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#0A0B1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  circleSeenCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00D4FF',
  },
  circleNotSeen: {
    fontSize: 11,
    color: '#6B6B8D',
  },
  presaleCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    padding: 16,
  },
  presaleHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  presaleImageContainer: {
    position: 'relative',
  },
  presaleImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#2D2D4A',
    overflow: 'hidden',
    backgroundColor: '#252542',
  },
  presaleImage: {
    width: '100%',
    height: '100%',
  },
  topTierBadgeSmall: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0A0B1E',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  presaleInfo: {
    flex: 1,
  },
  presaleArtistName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
  },
  genreText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  presaleSeenCount: {
    fontSize: 11,
    color: '#6B6B8D',
    marginTop: 4,
  },
  presaleDetails: {
    gap: 12,
  },
  presaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  presaleText: {
    fontSize: 13,
    color: '#A0A0B8',
  },
  presaleCodeWrapper: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D4A',
  },
  emptyPresaleText: {
    color: '#6B6B8D',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateGrid: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#A0A0B8',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});


