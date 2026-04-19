import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { colors } from '../lib/theme';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { uploadShowPhoto, getShowPhotos } from '../lib/api/showMedia';
import { useSafeBack } from '../lib/navigation/safeNavigation';
import { PillButton } from '../components/ui/PillButton';
import { MonoLabel } from '../components/ui/MonoLabel';

type MediaItem = {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  uploadedAt: string;
};

function PulsingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.pulsingDot, animStyle]} />
  );
}

function CountdownCell({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.countdownCell}>
      <Text style={styles.countdownNumber}>{value}</Text>
      <MonoLabel size={9} color={colors.brandCyan}>{label}</MonoLabel>
    </View>
  );
}

function useCountdown(targetDate?: Date) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!targetDate || targetDate <= now) return null;

  const diff = targetDate.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);

  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export default function ShowModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ticketId, eventId } = useLocalSearchParams<{ ticketId?: string; eventId?: string }>();
  const goBack = useSafeBack();

  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);

  const { ticket } = useTicketDetail(ticketId || '');
  const captureScale = useSharedValue(1);

  const eventData = ticket?.event as Record<string, unknown> | undefined;
  const doorsDate = eventData?.doorsAt
    ? new Date(eventData.doorsAt as string)
    : eventData?.date
      ? new Date(eventData.date as string)
      : undefined;
  const countdown = useCountdown(doorsDate);

  useEffect(() => {
    if (eventId) {
      void loadPhotos();
    }
  }, [eventId]);

  const loadPhotos = async () => {
    if (!eventId) return;
    try {
      const photos = await getShowPhotos(eventId);
      setMediaItems(photos);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to load photos:', error);
    }
  };

  const handleCapture = async () => {
    if (!eventId) return;
    if (!cameraRef.current?.takePictureAsync) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    captureScale.value = withSpring(0.9, {}, () => {
      captureScale.value = withSpring(1);
    });

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      const uploaded = await uploadShowPhoto(eventId, photo.uri, 'photo');
      setMediaItems((prev) => [uploaded, ...prev]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Capture failed:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const handlePickImage = async () => {
    if (!eventId) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (result.canceled) return;

    for (const asset of result.assets) {
      try {
        const type = asset.type === 'video' ? 'video' : 'photo';
        const uploaded = await uploadShowPhoto(eventId, asset.uri, type);
        setMediaItems((prev) => [uploaded, ...prev]);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Upload failed:', error);
      }
    }
  };

  const handleFlipCamera = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCameraFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const handleToggleFlash = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlash((current) => (current === 'off' ? 'on' : 'off'));
  };

  const handleClose = goBack;

  const handleShowTicket = () => {
    if (ticketId) {
      router.push({ pathname: '/wallet/[id]', params: { id: ticketId } });
    }
  };

  const handleCapturePress = () => {
    setShowCamera(true);
  };

  const handleDirections = () => {
    // Could deep-link to maps; for now just a placeholder
    if (ticket?.event?.venue?.name) {
      Alert.alert('Getting there', `Directions to ${ticket.event.venue.name}`);
    }
  };

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  // ---------- Camera view ----------
  if (showCamera) {
    if (!permission) {
      return <View style={styles.container} />;
    }

    if (!permission.granted) {
      return (
        <View style={styles.container}>
          <Stack.Screen options={{ headerShown: false }} />
          <Text style={styles.permissionText}>Camera access is required to capture moments from your show.</Text>
          <PillButton title="Grant Access" onPress={() => void requestPermission()} variant="solid" size="lg" />
          <View style={{ height: 12 }} />
          <PillButton title="Go Back" onPress={() => setShowCamera(false)} variant="ghost" size="lg" />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} flash={flash}>
          {/* Top Controls */}
          <View style={[styles.cameraTopControls, { paddingTop: insets.top + 8 }]}>
            <Pressable onPress={() => setShowCamera(false)} style={styles.controlButton} accessibilityRole="button">
              <BlurView intensity={50} style={styles.blurButton}>
                <Ionicons name="close" size={24} color={colors.textHi} />
              </BlurView>
            </Pressable>

            <View style={styles.cameraLiveIndicator}>
              <View style={styles.cameraLiveDot} />
              <Text style={styles.cameraLiveText}>REC</Text>
            </View>

            <Pressable onPress={handleToggleFlash} style={styles.controlButton} accessibilityRole="button">
              <BlurView intensity={50} style={styles.blurButton}>
                <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color={colors.textHi} />
              </BlurView>
            </Pressable>
          </View>

          {/* Bottom Controls */}
          <View style={[styles.cameraBottomControls, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable onPress={handlePickImage} style={styles.galleryButton} accessibilityRole="button">
              {mediaItems.length > 0 ? (
                <Image source={{ uri: mediaItems[0].uri }} style={styles.galleryPreview} />
              ) : (
                <View style={styles.galleryPlaceholder}>
                  <Ionicons name="images" size={24} color={colors.textHi} />
                </View>
              )}
              {mediaItems.length > 0 ? (
                <View style={styles.galleryCount}>
                  <Text style={styles.galleryCountText}>{mediaItems.length}</Text>
                </View>
              ) : null}
            </Pressable>

            <Animated.View style={captureButtonStyle}>
              <Pressable onPress={handleCapture} style={styles.captureButton} accessibilityRole="button">
                <View style={styles.captureButtonInner} />
              </Pressable>
            </Animated.View>

            <Pressable onPress={handleFlipCamera} style={styles.flipButton} accessibilityRole="button">
              <BlurView intensity={50} style={styles.blurButton}>
                <Ionicons name="camera-reverse" size={24} color={colors.textHi} />
              </BlurView>
            </Pressable>
          </View>
        </CameraView>
      </View>
    );
  }

  // ---------- Fallback states ----------
  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!eventId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionText}>Missing event. Try opening Show Mode from today's ticket.</Text>
        <PillButton title="Go Back" onPress={handleClose} variant="ghost" size="lg" />
      </View>
    );
  }

  // ---------- Main show-mode companion ----------
  return (
    <LinearGradient
      colors={['rgba(0,212,255,0.08)', colors.ink, colors.ink]}
      locations={[0, 0.45, 1]}
      style={styles.container}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Close button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={handleClose} hitSlop={12} accessibilityRole="button">
          <Ionicons name="close" size={24} color={colors.textMid} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Live indicator */}
        <View style={styles.liveRow}>
          <PulsingDot />
          <MonoLabel size={10.5} color={colors.brandCyan}>LIVE  ·  TONIGHT</MonoLabel>
        </View>

        {/* Artist name */}
        <Text style={styles.artistName} numberOfLines={2}>
          {ticket?.event?.artist?.name ?? 'Show'}
        </Text>

        {/* Venue */}
        <MonoLabel size={12} color={colors.textLo} style={{ marginTop: 8 }}>
          {(ticket?.event?.venue?.name ?? '').toUpperCase()}
        </MonoLabel>

        {/* Countdown */}
        {countdown ? (
          <View style={styles.countdownBox}>
            <CountdownCell value={countdown.hours} label="HRS" />
            <View style={styles.countdownDivider} />
            <CountdownCell value={countdown.minutes} label="MIN" />
            <View style={styles.countdownDivider} />
            <CountdownCell value={countdown.seconds} label="SEC" />
          </View>
        ) : null}
      </View>

      {/* Action buttons */}
      <View style={[styles.actions, { paddingBottom: insets.bottom + 24 }]}>
        <PillButton
          title="SHOW TICKET"
          onPress={handleShowTicket}
          variant="solid"
          size="lg"
          accentColor={colors.brandCyan}
        />
        <View style={{ height: 10 }} />
        <PillButton
          title="Capture a moment"
          onPress={handleCapturePress}
          variant="ghost"
          size="lg"
          icon={<Ionicons name="camera-outline" size={18} color={colors.textHi} />}
        />
        <View style={{ height: 10 }} />
        <PillButton
          title="Getting there"
          onPress={handleDirections}
          variant="ghost"
          size="lg"
          icon={<Ionicons name="navigate-outline" size={18} color={colors.textHi} />}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },

  // --- Top bar ---
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
  },

  // --- Content ---
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brandCyan,
  },
  artistName: {
    fontSize: 52,
    fontWeight: '400',
    letterSpacing: -1.5,
    color: colors.textHi,
  },

  // --- Countdown ---
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
    marginTop: 32,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  countdownCell: {
    alignItems: 'center',
    minWidth: 52,
  },
  countdownNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textHi,
    marginBottom: 2,
  },
  countdownDivider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    backgroundColor: colors.hairline,
    marginHorizontal: 14,
  },

  // --- Actions ---
  actions: {
    paddingHorizontal: 28,
    gap: 0,
  },

  // --- Camera view styles ---
  camera: {
    flex: 1,
    width: '100%',
  },
  cameraTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  blurButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraLiveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  cameraLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textHi,
  },
  cameraLiveText: {
    color: colors.textHi,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cameraBottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  galleryPreview: {
    width: '100%',
    height: '100%',
  },
  galleryPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryCount: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.brandPurple,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  galleryCountText: {
    color: colors.textHi,
    fontSize: 11,
    fontWeight: '700',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.textHi,
    padding: 4,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: colors.textHi,
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },

  // --- Permission / fallback ---
  permissionText: {
    color: colors.textHi,
    fontSize: 16,
    textAlign: 'center',
    padding: 32,
  },
});
