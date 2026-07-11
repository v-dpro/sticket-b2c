import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

import type { ShareCardData } from '../../types/share';

import { ShareSheet } from './ShareSheet';
import { useShare } from '../../hooks/useShare';
import { useShareCard } from '../../hooks/useShareCard';

interface ShareButtonProps {
  data: ShareCardData;
  link?: string;
  message?: string;
  renderTrigger?: (onPress: () => void) => React.ReactNode;
}

export function ShareButton({ data, link, message, renderTrigger }: ShareButtonProps) {
  const { tokens } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const styles = useThemedStyles((t) => ({
    button: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: t.colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
    },
    hiddenContainer: {
      position: 'absolute',
      left: -9999,
      top: -9999,
    },
  }));

  const { cardRef, captureCard, sharePng, shareInstagram, saveToGallery, copy } = useShare();
  const { renderCard } = useShareCard();

  const cardElement = useMemo(() => renderCard(data), [data, renderCard]);

  const capture = useCallback(async () => {
    setShowPreview(true);
    await new Promise((r) => setTimeout(r, 80));
    const uri = await captureCard();
    setShowPreview(false);
    return uri;
  }, [captureCard]);

  const requireLink = useCallback(() => {
    if (!link) {
      Alert.alert('No link available', 'This content does not have a shareable link yet.');
      return false;
    }
    return true;
  }, [link]);

  const openSheet = useCallback(() => setSheetVisible(true), []);

  return (
    <>
      {renderTrigger ? (
        renderTrigger(openSheet)
      ) : (
        <Pressable style={styles.button} onPress={openSheet} accessibilityRole="button">
          <Ionicons name="share-outline" size={22} color={tokens.colors.textHi} />
        </Pressable>
      )}

      {showPreview ? (
        <View style={styles.hiddenContainer} pointerEvents="none">
          <View ref={cardRef as any} collapsable={false}>
            {cardElement}
          </View>
        </View>
      ) : null}

      <ShareSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onShareInstagram={async () => {
          setSheetVisible(false);
          const uri = await capture();
          if (!uri) return;
          await shareInstagram(uri);
        }}
        onShareTwitter={async () => {
          setSheetVisible(false);
          const uri = await capture();
          if (!uri) return;
          await sharePng(uri, message);
        }}
        onCopyLink={async () => {
          setSheetVisible(false);
          if (!requireLink()) return;
          await copy(link!);
        }}
        onShareMore={async () => {
          setSheetVisible(false);
          const uri = await capture();
          if (!uri) return;
          await sharePng(uri, message);
        }}
        onSaveImage={async () => {
          setSheetVisible(false);
          const uri = await capture();
          if (!uri) return;
          await saveToGallery(uri);
        }}
      />
    </>
  );
}



