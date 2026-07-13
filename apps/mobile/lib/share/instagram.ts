// lib/share/instagram.ts — the EASY Instagram export path for memory posts.
//
// Two routes, one that ships today and one aspirational:
//   • captureStoryCard(ref) snapshots the offscreen <StoryShareCard/> to a
//     temp PNG via react-native-view-shot (native pixel density upscales the
//     360×640 card to ~1080×1920 on a 3× device — a full-res 9:16 story image).
//   • shareImage(uri) hands that PNG to the OS share sheet. On iOS this is the
//     activity sheet that lists Instagram (Story / Post / Reels), Messages,
//     Save Image, etc. THIS is the primary, dependency-light path — no native
//     module, works in a managed build.
//   • openInstagramStory(uri) is where a *direct* "instagram-stories://share"
//     hand-off (image preloaded as the Story background) would live. That deep
//     link requires writing the image to UIPasteboard under Instagram's private
//     item keys (com.instagram.sharedSticker.backgroundImage) and opening the
//     scheme within ~5s. Managed Expo has no API for typed pasteboard items —
//     expo-clipboard only writes strings / urls / a plain image, none of which
//     IG reads as a sticker source — so this would need a custom native module.
//     Out of scope: it falls back to shareImage() (see NOTE in the body).
//   • canOpenInstagram() reports whether IG is installed. On iOS this only
//     returns true once "instagram" / "instagram-stories" are listed in
//     app.json's ios.infoPlist.LSApplicationQueriesSchemes (needs a rebuild).

import type { ComponentRef, RefObject } from 'react';
import { Platform, Share, View } from 'react-native';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

/**
 * Snapshot the offscreen story card to a temp PNG.
 * The card must be mounted + laid out (wrapped in collapsable={false}) before
 * this is called, or the ref will be null / the capture blank.
 * @returns the PNG's file uri, or null if the ref was unmounted / capture threw.
 */
export async function captureStoryCard(
  cardRef: RefObject<ComponentRef<typeof View> | null>,
): Promise<string | null> {
  try {
    if (!cardRef.current) return null;
    const uri = await captureRef(cardRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri ?? null;
  } catch (error) {
    console.warn('captureStoryCard failed:', error);
    return null;
  }
}

/** view-shot returns a bare path on iOS; the share APIs want a file:// URL. */
function toFileUrl(uri: string): string {
  if (uri.includes('://')) return uri; // already file:// / content:// / http(s)
  return `file://${uri}`;
}

/**
 * Primary share path — present the OS share sheet on the captured PNG.
 * iOS uses RN's Share.share({ url }) (sharing the file itself, so Instagram and
 * friends see an image, not a text link). Android's RN Share can't attach a
 * file, so we route through expo-sharing (already a dependency), which shares
 * image files via the system chooser.
 * @returns true if the sheet was presented (i.e. not dismissed with an error).
 */
export async function shareImage(uri: string): Promise<boolean> {
  const url = toFileUrl(uri);
  try {
    if (Platform.OS === 'ios') {
      // `url` (not `message`) → the activity sheet shares the image file.
      const result = await Share.share({ url });
      return result.action !== Share.dismissedAction;
    }
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(url, { mimeType: 'image/png', dialogTitle: 'Share this memory' });
      return true;
    }
    return false;
  } catch (error) {
    console.warn('shareImage failed:', error);
    return false;
  }
}

/** True if Instagram is installed (iOS also needs the LSApplicationQueriesSchemes entries). */
export async function canOpenInstagram(): Promise<boolean> {
  try {
    return await Linking.canOpenURL('instagram://');
  } catch {
    return false;
  }
}

/**
 * "Share straight to an Instagram Story" — the branded story hand-off.
 *
 * NOTE: A true instagram-stories://share hand-off needs the image written to
 * UIPasteboard under IG's private sticker keys before opening the scheme, which
 * managed Expo cannot do without a native module (see the file header). Rather
 * than add native code, we take the reliable route: the OS share sheet, from
 * which the user taps Instagram → Story / Post / Reels. Kept as its own export
 * so the call site's intent stays clear and a future native module has a home.
 */
export async function openInstagramStory(uri: string): Promise<boolean> {
  return shareImage(uri);
}
