import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { VenueMarker } from '../../types/profile';
import { getUserVenueMarkers } from '../../lib/api/profile';

interface ProfileMapViewProps {
  userId: string;
  onVenuePress: (venueId: string) => void;
}

export function ProfileMapView({ userId, onVenuePress }: ProfileMapViewProps) {
  const [markers, setMarkers] = useState<VenueMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadMarkers = async () => {
    if (!userId || userId.startsWith('user_')) {
      setMarkers([]);
      setLoading(false);
      return;
    }

    try {
      const data = await getUserVenueMarkers(userId);
      setMarkers(data);
    } catch (error: any) {
      const status = error?.response?.status;
      // Expected when the user doesn't exist server-side (local-only ids).
      if (status === 401 || status === 404) {
        setMarkers([]);
        return;
      }
      // eslint-disable-next-line no-console
      console.warn('Failed to load markers:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedMarkers = useMemo(() => {
    return [...markers].sort((a, b) => (b.showCount ?? 0) - (a.showCount ?? 0));
  }, [markers]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading venues...</Text>
      </View>
    );
  }

  if (markers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={64} color="#6B6B8D" />
        <Text style={styles.emptyTitle}>No venues to show</Text>
        <Text style={styles.emptyText}>Log some shows to see them here!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.webNotice}>
        <Ionicons name="globe-outline" size={18} color="#A0A0B8" />
        <Text style={styles.webNoticeText}>Map view isn’t available on web yet — showing a venue list instead.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {sortedMarkers.map((marker) => (
          <Pressable key={marker.id} style={styles.item} onPress={() => onVenuePress(marker.id)}>
            <View style={styles.itemLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{marker.showCount}</Text>
              </View>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {marker.name}
                </Text>
                <Text style={styles.itemSubtitle} numberOfLines={1}>
                  {marker.city}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#6B6B8D" />
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.statsOverlay}>
        <Text style={styles.statsText}>
          {markers.length} venue{markers.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6B6B8D',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B6B8D',
    marginTop: 8,
    textAlign: 'center',
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(18, 19, 45, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4A',
  },
  webNoticeText: {
    flex: 1,
    color: '#A0A0B8',
    fontSize: 12,
  },
  listContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 48,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    backgroundColor: '#1A1A2E',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  badge: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 34,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  itemSubtitle: {
    color: '#6B6B8D',
    fontSize: 12,
    marginTop: 2,
  },
  statsOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(18, 19, 45, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});


