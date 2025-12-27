import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';

import { colors, gradients } from '../lib/theme';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { uploadShowPhoto, getShowPhotos } from '../lib/api/showMedia';
import { useSafeBack } from '../lib/navigation/safeNavigation';

type MediaItem = {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  uploadedAt: string;
};

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

  const { ticket } = useTicketDetail(ticketId || '');
  const captureScale = useSharedValue(1);

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

  const handleLogShow = () => {
    router.push({
      pathname: '/log/details',
      params: { eventId, mediaCount: String(mediaItems.length) },
    });
  };

  const captureButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: captureScale.value }],
  }));

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionText}>Camera access is required to capture moments from your show.</Text>
        <Pressable style={styles.permissionButton} onPress={() => void requestPermission()} accessibilityRole="button">
          <Text style={styles.permissionButtonText}>Grant Access</Text>
        </Pressable>
        <Pressable style={[styles.permissionButton, { marginTop: 12, backgroundColor: colors.surface }]} onPress={handleClose} accessibilityRole="button">
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!eventId) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.permissionText}>Missing event. Try opening Show Mode from today’s ticket.</Text>
        <Pressable style={styles.permissionButton} onPress={handleClose} accessibilityRole="button">
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <CameraView ref={cameraRef} style={styles.camera} facing={cameraFacing} flash={flash}>
        {/* Top Controls */}
        <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={handleClose} style={styles.controlButton} accessibilityRole="button">
            <BlurView intensity={50} style={styles.blurButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </BlurView>
          </Pressable>

          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>

          <Pressable onPress={handleToggleFlash} style={styles.controlButton} accessibilityRole="button">
            <BlurView intensity={50} style={styles.blurButton}>
              <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color="#FFFFFF" />
            </BlurView>
          </Pressable>
        </View>

        {/* Show Info Banner */}
        <View style={styles.showInfoBanner}>
          <BlurView intensity={80} style={styles.showInfoBlur}>
            <Text style={styles.showInfoArtist} numberOfLines={1}>
              {ticket?.event?.artist?.name ?? 'Show'}
            </Text>
            <Text style={styles.showInfoVenue} numberOfLines={1}>
              {ticket?.event?.venue?.name ?? ''}
            </Text>
          </BlurView>
        </View>

        {/* Bottom Controls */}
        <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
          <Pressable onPress={handlePickImage} style={styles.galleryButton} accessibilityRole="button">
            {mediaItems.length > 0 ? (
              <Image source={{ uri: mediaItems[0].uri }} style={styles.galleryPreview} />
            ) : (
              <View style={styles.galleryPlaceholder}>
                <Ionicons name="images" size={24} color="#FFFFFF" />
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
              <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
            </BlurView>
          </Pressable>
        </View>
      </CameraView>

      {mediaItems.length > 0 ? (
        <View style={[styles.logPrompt, { bottom: insets.bottom + 100 }]}>
          <Pressable onPress={handleLogShow} style={styles.logPromptButton} accessibilityRole="button">
            <Text style={styles.logPromptText}>{mediaItems.length} photos captured</Text>
            <Text style={styles.logPromptAction}>Log this show →</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  topControls: {
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  showInfoBanner: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  showInfoBlur: {
    padding: 16,
    alignItems: 'center',
  },
  showInfoArtist: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  showInfoVenue: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  bottomControls: {
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
  logPrompt: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  logPromptButton: {
    backgroundColor: colors.brandPurple,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logPromptText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  logPromptAction: {
    color: colors.brandCyan,
    fontSize: 15,
    fontWeight: '700',
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    padding: 32,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    overflow: 'hidden',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});



