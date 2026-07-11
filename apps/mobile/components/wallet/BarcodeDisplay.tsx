import React, { useMemo, useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Barcode from 'react-native-barcode-svg';
import QRCode from 'react-native-qrcode-svg';

import type { BarcodeFormat } from '../../types/ticket';
import { useTheme } from '../../lib/theme-context';

const { width } = Dimensions.get('window');

// The scan surface is ALWAYS a pure-white card in both themes — scanners
// need the high-contrast black-on-white barcode. Text/marks inside it are
// therefore fixed dark values, not theme tokens.
const SCAN_INK = '#000000';
const SCAN_MUTE = '#6B6B76';

interface BarcodeDisplayProps {
  barcode: string;
  format: BarcodeFormat;
  barcodeImageUrl?: string;
}

export function BarcodeDisplay({ barcode, format, barcodeImageUrl }: BarcodeDisplayProps) {
  const { tokens } = useTheme();
  const [brightness, setBrightness] = useState(false);

  const white = tokens.colors.white;
  const mono = tokens.fontFamilies.mono;

  const normalized = useMemo(() => {
    if (!format) return 'UNKNOWN' as const;
    return format;
  }, [format]);

  // If we have a stored image, use that
  if (barcodeImageUrl) {
    return (
      <Pressable
        style={[styles.container, { backgroundColor: white }, brightness && styles.bright]}
        onPress={() => setBrightness(!brightness)}
      >
        <Image source={{ uri: barcodeImageUrl }} style={styles.barcodeImage} resizeMode="contain" />
        <Text style={[styles.hint, { color: SCAN_MUTE }]}>Tap to {brightness ? 'dim' : 'brighten'}</Text>
      </Pressable>
    );
  }

  const renderBarcode = () => {
    switch (normalized) {
      case 'QR':
        return <QRCode value={barcode} size={200} backgroundColor={white} color={SCAN_INK} />;
      case 'CODE128':
        return (
          <Barcode
            value={barcode}
            format="CODE128"
            maxWidth={width - 80}
            height={100}
          />
        );
      case 'PDF417':
      case 'AZTEC':
        // react-native-barcode-svg doesn't support these formats; fall back.
        return (
          <View style={styles.fallback}>
            <Ionicons name="barcode" size={48} color={SCAN_MUTE} />
            <Text style={[styles.fallbackCode, { fontFamily: mono, color: SCAN_INK }]}>{barcode}</Text>
            <Text style={[styles.fallbackHint, { color: SCAN_MUTE }]}>Unsupported barcode format</Text>
          </View>
        );
      default:
        return (
          <View style={styles.fallback}>
            <Ionicons name="barcode" size={48} color={SCAN_MUTE} />
            <Text style={[styles.fallbackCode, { fontFamily: mono, color: SCAN_INK }]}>{barcode}</Text>
          </View>
        );
    }
  };

  return (
    <Pressable
      style={[styles.container, { backgroundColor: white }, brightness && { shadowColor: white }]}
      onPress={() => setBrightness(!brightness)}
    >
      <View style={styles.barcodeWrapper}>{renderBarcode()}</View>
      <Text style={[styles.barcodeText, { fontFamily: mono, color: SCAN_INK }]}>{barcode}</Text>
      <Text style={[styles.hint, { color: SCAN_MUTE }]}>Tap to {brightness ? 'dim' : 'brighten'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  bright: {
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  barcodeWrapper: {
    padding: 16,
  },
  barcodeImage: {
    width: width - 80,
    height: 120,
  },
  barcodeText: {
    marginTop: 12,
    fontSize: 14,
    letterSpacing: 2,
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
  },
  fallback: {
    alignItems: 'center',
    padding: 24,
  },
  fallbackCode: {
    marginTop: 12,
    fontSize: 16,
    letterSpacing: 1,
    textAlign: 'center',
  },
  fallbackHint: {
    marginTop: 8,
    fontSize: 12,
  },
});
