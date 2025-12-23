import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import MapView, { Callout, Marker, PROVIDER_DEFAULT } from 'react-native-maps';

import type { VenueMarker } from '../../types/profile';
import { getUserVenueMarkers } from '../../lib/api/profile';

const { width, height } = Dimensions.get('window');

interface ProfileMapViewProps {
  userId: string;
  onVenuePress: (venueId: string) => void;
}

// Custom map style for dark theme
const mapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0A0B1E' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6B6B8D' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0B1E' }] },
  {
    featureType: 'administrative',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2D2D4A' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1A1A2E' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2D2D4A' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
];

export function ProfileMapView({ userId, onVenuePress }: ProfileMapViewProps) {
  const [markers, setMarkers] = useState<VenueMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState({
    latitude: 39.8283,
    longitude: -98.5795,
    latitudeDelta: 50,
    longitudeDelta: 50,
  });

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

      // Fit to markers
      if (data.length > 0) {
        const lats = data.map((m) => m.lat);
        const lngs = data.map((m) => m.lng);

        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);

        setRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max(maxLat - minLat, 10) * 1.5,
          longitudeDelta: Math.max(maxLng - minLng, 10) * 1.5,
        });
      }
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

  const mapHeight = useMemo(() => Math.max(260, height - 300), []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (markers.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="map-outline" size={64} color="#6B6B8D" />
        <Text style={styles.emptyTitle}>No venues to show</Text>
        <Text style={styles.emptyText}>Log some shows to see them on the map!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView style={[styles.map, { height: mapHeight }]} provider={PROVIDER_DEFAULT} initialRegion={region} customMapStyle={mapStyle}>
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.lat,
              longitude: marker.lng,
            }}
            onPress={() => onVenuePress(marker.id)}
          >
            {/* Custom Marker */}
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <Text style={styles.markerCount}>{marker.showCount}</Text>
              </View>
              <View style={styles.markerArrow} />
            </View>

            {/* Callout */}
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{marker.name}</Text>
                <Text style={styles.calloutCity}>{marker.city}</Text>
                <Text style={styles.calloutCount}>
                  {marker.showCount} show{marker.showCount !== 1 ? 's' : ''}
                </Text>
                {marker.lastShow ? <Text style={styles.calloutLast}>Last: {marker.lastShow.artistName}</Text> : null}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Stats overlay */}
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
  map: {
    width,
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
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  markerCount: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#8B5CF6',
    marginTop: -1,
  },
  callout: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 12,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  calloutTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  calloutCity: {
    color: '#A0A0B8',
    fontSize: 12,
    marginBottom: 4,
  },
  calloutCount: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '500',
  },
  calloutLast: {
    color: '#6B6B8D',
    fontSize: 11,
    marginTop: 4,
  },
  statsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(18, 19, 45, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statsText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
});




