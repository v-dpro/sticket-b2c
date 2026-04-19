import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { colors } from '../../lib/theme';

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
                <Ionicons name="location" size={24} color={colors.brandPurple} />
              </View>
            </Marker>
          </MapView>
        </View>
      ) : null}

      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={20} color={colors.brandPurple} />
        <View style={styles.addressText}>
          {address ? <Text style={styles.address}>{address}</Text> : null}
          <Text style={styles.cityState}>
            {city}
            {state ? `, ${state}` : ''}
          </Text>
        </View>
      </View>

      <Pressable style={styles.directionsButton} onPress={handleGetDirections}>
        <Ionicons name="navigate" size={18} color={colors.brandCyan} />
        <Text style={styles.directionsText}>Get Directions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  mapContainer: {
    height: 120,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: colors.textHi,
    borderRadius: 20,
    padding: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  addressText: {
    flex: 1,
    marginLeft: 12,
  },
  address: {
    fontSize: 14,
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
    padding: 12,
    gap: 6,
  },
  directionsText: {
    fontSize: 14,
    color: colors.brandCyan,
    fontWeight: '500',
  },
});



