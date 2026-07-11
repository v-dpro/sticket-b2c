import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

import type { BarcodeFormat } from '../../types/ticket';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { PillButton } from '../../components/ui/PillButton';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

function mapCameraTypeToBarcodeFormat(type: string | undefined): BarcodeFormat {
  const t = String(type || '').toLowerCase();
  if (t === 'qr') return 'QR';
  if (t === 'code128') return 'CODE128';
  if (t === 'pdf417') return 'PDF417';
  if (t === 'aztec') return 'AZTEC';
  return 'UNKNOWN';
}

export default function ScanTicketScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const supportedTypes = useMemo(() => ['qr', 'code128', 'pdf417', 'aztec'], []);

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 8 },
    permissionTitle: { fontSize: 22, fontWeight: '800', color: t.colors.fg, marginTop: 16, letterSpacing: -0.4 },
    permissionText: { fontSize: 16, color: t.colors.mute, textAlign: 'center', marginBottom: 16 },
  }));

  const onBarcodeScanned = ({ data, type }: { data: string; type?: string }) => {
    if (scanned) return;
    setScanned(true);

    const format = mapCameraTypeToBarcodeFormat(type);

    router.replace({
      pathname: '/wallet/add-ticket',
      params: {
        barcode: data,
        barcodeFormat: format,
      },
    });
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={tokens.colors.mute} />
          <Text style={styles.permissionTitle}>Camera Access</Text>
          <Text style={styles.permissionText}>We need camera access to scan barcodes</Text>
          <PillButton title="Grant Access" variant="primary" size="lg" onPress={() => void requestPermission()} springFeedback haptic="light" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={cameraStyles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: supportedTypes as any }}
        onBarcodeScanned={scanned ? undefined : onBarcodeScanned}
      >
        <SpringPressable style={cameraStyles.closeButton} onPress={goBack} haptic="light" hitSlop={10} accessibilityRole="button" accessibilityLabel="Close scanner">
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </SpringPressable>

        <View style={cameraStyles.scanFrame}>
          <View style={cameraStyles.corner} />
          <View style={[cameraStyles.corner, cameraStyles.cornerTopRight]} />
          <View style={[cameraStyles.corner, cameraStyles.cornerBottomLeft]} />
          <View style={[cameraStyles.corner, cameraStyles.cornerBottomRight]} />
        </View>

        <View style={cameraStyles.instructions}>
          <Text style={cameraStyles.instructionText}>Point at a barcode or QR code</Text>
        </View>
      </CameraView>
    </View>
  );
}

// Camera overlay controls sit on a live video feed — fixed white / dark scrim
// for guaranteed contrast, independent of app theme.
const cameraStyles = StyleSheet.create({
  camera: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: 0,
    left: 0,
  },
  cornerTopRight: {
    left: undefined,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  cornerBottomRight: {
    top: undefined,
    left: undefined,
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    position: 'absolute',
    bottom: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
