import React from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';

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
                <Ionicons name="location" size={24} color="#8B5CF6" />
              </View>
            </Marker>
          </MapView>
        </View>
      ) : null}

      <View style={styles.addressContainer}>
        <Ionicons name="location-outline" size={20} color="#8B5CF6" />
        <View style={styles.addressText}>
          {address ? <Text style={styles.address}>{address}</Text> : null}
          <Text style={styles.cityState}>
            {city}
            {state ? `, ${state}` : ''}
          </Text>
        </View>
      </View>

      <Pressable style={styles.directionsButton} onPress={handleGetDirections}>
        <Ionicons name="navigate" size={18} color="#00D4FF" />
        <Text style={styles.directionsText}>Get Directions</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2D2D4A',
  },
  mapContainer: {
    height: 120,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  marker: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
  },
  addressContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4A',
  },
  addressText: {
    flex: 1,
    marginLeft: 12,
  },
  address: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  cityState: {
    fontSize: 12,
    color: '#6B6B8D',
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
    color: '#00D4FF',
    fontWeight: '500',
  },
});



