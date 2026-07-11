import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
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

import { useTheme, useThemedStyles } from '../lib/theme-context';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { uploadShowPhoto, getShowPhotos } from '../lib/api/showMedia';
import { useSafeBack } from '../lib/navigation/safeNavigation';
import { PillButton } from '../components/ui/PillButton';
import { MonoLabel } from '../components/ui/MonoLabel';
import { SpringPressable } from '../components/ui/SpringPressable';

type MediaItem = {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  uploadedAt: string;
};

function PulsingDot() {
  const { tokens } = useTheme();
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
    <Animated.View
      style={[{ width: 6, height: 6, borderRadius: 3, backgroundColor: tokens.colors.error }, animStyle]}
    />
  );
}

function CountdownCell({ value, label }: { value: string; label: string }) {
  const { tokens } = useTheme();
  return (
    <View style={{ alignItems: 'center', minWidth: 52 }}>
      <Text
        style={{
          fontFamily: tokens.fontFamilies.monoBold,
          fontSize: 34,
          fontWeight: '700',
          color: tokens.colors.fg,
          marginBottom: 2,
        }}
      >
        {value}
      </Text>
      <MonoLabel size={9} color={tokens.colors.error}>{label}</MonoLabel>
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
  const { tokens } = useTheme();
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

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20 },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
    liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    artistName: {
      fontSize: 48,
      fontWeight: '800',
      letterSpacing: -1.5,
      color: t.colors.fg,
    },
    countdownBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.xl,
      borderWidth: 1,
      borderColor: t.colors.hairline,
      marginTop: 32,
      paddingVertical: 18,
      paddingHorizontal: 24,
      alignSelf: 'flex-start',
    },
    countdownDivider: {
      width: StyleSheet.hairlineWidth,
      height: 36,
      backgroundColor: t.colors.line,
      marginHorizontal: 14,
    },
    actions: { paddingHorizontal: 28 },
    permissionText: {
      color: t.colors.fg,
      fontSize: 16,
      textAlign: 'center',
      padding: 32,
    },
  }));

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
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Stack.Screen options={{ headerShown: false }} />
          <Text style={styles.permissionText}>Camera access is required to capture moments from your show.</Text>
          <PillButton title="Grant Access" onPress={() => void requestPermission()} variant="primary" size="lg" springFeedback haptic="light" />
          <View style={{ height: 12 }} />
          <PillButton title="Go Back" onPress={() => setShowCamera(false)} variant="ghost" size="lg" springFeedback haptic="light" />
        </View>
      );
    }

    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <CameraView ref={cameraRef} style={cameraStyles.camera} facing={cameraFacing} flash={flash}>
          {/* Top Controls */}
          <View style={[cameraStyles.cameraTopControls, { paddingTop: insets.top + 8 }]}>
            <SpringPressable onPress={() => setShowCamera(false)} haptic="light" style={cameraStyles.controlButton} accessibilityRole="button">
              <BlurView intensity={50} style={cameraStyles.blurButton}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </BlurView>
            </SpringPressable>

            <View style={cameraStyles.cameraLiveIndicator}>
              <View style={cameraStyles.cameraLiveDot} />
              <Text style={cameraStyles.cameraLiveText}>REC</Text>
            </View>

            <SpringPressable onPress={handleToggleFlash} haptic="light" style={cameraStyles.controlButton} accessibilityRole="button">
              <BlurView intensity={50} style={cameraStyles.blurButton}>
                <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color="#FFFFFF" />
              </BlurView>
            </SpringPressable>
          </View>

          {/* Bottom Controls */}
          <View style={[cameraStyles.cameraBottomControls, { paddingBottom: insets.bottom + 16 }]}>
            <SpringPressable onPress={handlePickImage} haptic="light" style={cameraStyles.galleryButton} accessibilityRole="button">
              {mediaItems.length > 0 ? (
                <Image source={{ uri: mediaItems[0].uri }} style={cameraStyles.galleryPreview} />
              ) : (
                <View style={cameraStyles.galleryPlaceholder}>
                  <Ionicons name="images" size={24} color="#FFFFFF" />
                </View>
              )}
              {mediaItems.length > 0 ? (
                <View style={[cameraStyles.galleryCount, { backgroundColor: tokens.colors.accent }]}>
                  <Text style={cameraStyles.galleryCountText}>{mediaItems.length}</Text>
                </View>
              ) : null}
            </SpringPressable>

            <Animated.View style={captureButtonStyle}>
              <SpringPressable onPress={handleCapture} haptic="medium" style={cameraStyles.captureButton} accessibilityRole="button">
                <View style={cameraStyles.captureButtonInner} />
              </SpringPressable>
            </Animated.View>

            <SpringPressable onPress={handleFlipCamera} haptic="light" style={cameraStyles.flipButton} accessibilityRole="button">
              <BlurView intensity={50} style={cameraStyles.blurButton}>
                <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
              </BlurView>
            </SpringPressable>
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
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionText}>Missing event. Try opening Show Mode from today's ticket.</Text>
        <PillButton title="Go Back" onPress={handleClose} variant="ghost" size="lg" springFeedback haptic="light" />
      </View>
    );
  }

  // ---------- Main show-mode companion ----------
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Close button */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <SpringPressable onPress={handleClose} haptic="light" hitSlop={12} accessibilityRole="button">
          <Ionicons name="close" size={24} color={tokens.colors.mute} />
        </SpringPressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Live indicator */}
        <View style={styles.liveRow}>
          <PulsingDot />
          <MonoLabel size={10.5} color={tokens.colors.error}>LIVE  ·  TONIGHT</MonoLabel>
        </View>

        {/* Artist name */}
        <Text style={styles.artistName} numberOfLines={2}>
          {ticket?.event?.artist?.name ?? 'Show'}
        </Text>

        {/* Venue */}
        <MonoLabel size={12} color={tokens.colors.mute} style={{ marginTop: 8 }}>
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
          title="Show ticket"
          onPress={handleShowTicket}
          variant="primary"
          size="lg"
          springFeedback
          haptic="medium"
        />
        <View style={{ height: 10 }} />
        <PillButton
          title="Capture a moment"
          onPress={handleCapturePress}
          variant="ghost"
          size="lg"
          springFeedback
          haptic="light"
          icon={<Ionicons name="camera-outline" size={18} color={tokens.colors.fg} />}
        />
        <View style={{ height: 10 }} />
        <PillButton
          title="Getting there"
          onPress={handleDirections}
          variant="ghost"
          size="lg"
          springFeedback
          haptic="light"
          icon={<Ionicons name="navigate-outline" size={18} color={tokens.colors.fg} />}
        />
      </View>
    </View>
  );
}

// Camera overlay controls sit on a live video feed — fixed white / dark scrim
// (and a red REC pill) for guaranteed contrast, independent of app theme.
const cameraStyles = StyleSheet.create({
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
    backgroundColor: '#FFFFFF',
  },
  cameraLiveText: {
    color: '#FFFFFF',
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
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  galleryCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 4,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
  },
  flipButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
});
