import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';

interface LocationCardProps {
  name: string;
  address?: string;
  city: string;
  state?: string;
  lat?: number;
  lng?: number;
}

export function LocationCard({ name, address, city, state, lat, lng }: LocationCardProps) {
  const hasCoordinates = typeof lat === 'number' && typeof lng === 'number';

  const handleGetDirections = () => {
    const destination = encodeURIComponent(address || `${name}, ${city}${state ? `, ${state}` : ''}`);

    const url = Platform.select({
      ios: `maps://app?daddr=${destination}`,
      android: `google.navigation:q=${destination}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });

    if (url) Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>MAP</Text>

      {/* Map placeholder or real map */}
      {hasCoordinates ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: lat!,
              longitude: lng!,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker coordinate={{ latitude: lat!, longitude: lng! }}>
              <View style={styles.marker}>
                <Ionicons name="location" size={20} color={accentSets.cyan.hex} />
              </View>
            </Marker>
          </MapView>
        </View>
      ) : (
        <View style={styles.mapPlaceholder}>
          <LinearGradient
            colors={[colors.surface, colors.elevated]}
            style={styles.placeholderGradient}
          >
            <Ionicons name="location" size={28} color={accentSets.cyan.hex} />
            <Text style={styles.placeholderText}>{address || `${city}${state ? `, ${state}` : ''}`}</Text>
          </LinearGradient>
        </View>
      )}

      {/* Address row */}
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={16} color={colors.textLo} />
        <View style={styles.addressContent}>
          {address ? <Text style={styles.address}>{address}</Text> : null}
          <Text style={styles.cityState}>
            {city}
            {state ? `, ${state}` : ''}
          </Text>
        </View>
      </View>

      <Pressable style={styles.directionsButton} onPress={handleGetDirections}>
        <Ionicons name="navigate" size={16} color={colors.ink} />
        <Text style={styles.directionsText}>Directions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 2,
    color: colors.textLo,
    marginBottom: 10,
  },
  mapContainer: {
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: colors.textHi,
    borderRadius: 16,
    padding: 4,
  },
  mapPlaceholder: {
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  placeholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 12,
    color: colors.textLo,
  },
  addressRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  addressContent: {
    flex: 1,
  },
  address: {
    fontSize: 13,
    color: colors.textHi,
    marginBottom: 2,
  },
  cityState: {
    fontSize: 12,
    color: colors.textLo,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 9999,
    backgroundColor: accentSets.cyan.hex,
    marginTop: 12,
    gap: 6,
  },
  directionsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
});
