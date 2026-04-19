import React, { useMemo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const destinationLabel = useMemo(() => {
    return address || `${name}, ${city}${state ? `, ${state}` : ''}`;
  }, [address, name, city, state]);

  const handleGetDirections = () => {
    const destination = encodeURIComponent(destinationLabel);

    const url = Platform.select({
      ios: `maps://app?daddr=${destination}`,
      android: `google.navigation:q=${destination}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    });

    if (url) Linking.openURL(url);
  };

  const handleOpenMap = () => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      return;
    }

    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationLabel)}`);
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.mapPlaceholder} onPress={handleOpenMap}>
        <Ionicons name="map-outline" size={22} color={colors.brandPurple} />
        <Text style={styles.mapPlaceholderText}>Open in Google Maps</Text>
      </Pressable>

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
  mapPlaceholder: {
    height: 120,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(10, 11, 30, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  mapPlaceholderText: {
    fontSize: 13,
    color: colors.textMid,
    fontWeight: '600',
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


