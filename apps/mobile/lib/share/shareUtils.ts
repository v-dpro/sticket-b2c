import { Alert, Platform } from 'react-native';

import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

export async function shareImage(imageUri: string, message?: string): Promise<boolean> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();

    if (!isAvailable) {
      Alert.alert('Sharing not available', 'Sharing is not available on this device');
      return false;
    }

    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: message || 'Share via Sticket',
    });

    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Share error:', error);
    return false;
  }
}

export async function shareToInstagramStory(imageUri: string): Promise<boolean> {
  // Proper Instagram Stories integration requires native iOS plumbing.
  // For now we do best-effort: if IG is installed, we still fall back to the standard share sheet.
  if (Platform.OS !== 'ios') {
    return shareImage(imageUri);
  }

  try {
    const instagramUrl = `instagram-stories://share`;
    const canOpen = await Linking.canOpenURL(instagramUrl);

    if (!canOpen) {
      Alert.alert('Instagram not installed', 'Please install Instagram to share to Stories');
      return false;
    }

    return shareImage(imageUri);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Instagram share error:', error);
    return shareImage(imageUri);
  }
}

export async function copyLink(url: string): Promise<void> {
  await Clipboard.setStringAsync(url);
  Alert.alert('Link Copied', 'Link copied to clipboard');
}

export async function saveImageToLibrary(imageUri: string): Promise<boolean> {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to save images');
      return false;
    }

    await MediaLibrary.saveToLibraryAsync(imageUri);
    Alert.alert('Saved!', 'Image saved to your gallery');
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Save error:', error);
    Alert.alert('Error', 'Failed to save image');
    return false;
  }
}



