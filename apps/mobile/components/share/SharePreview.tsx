import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

import type { ShareCardData } from '../../types/share';

import { useShare } from '../../hooks/useShare';
import { useShareCard } from '../../hooks/useShareCard';
import { ShareSheet } from './ShareSheet';

interface SharePreviewProps {
  data: ShareCardData;
  link?: string;
}

export function SharePreview({ data, link }: SharePreviewProps) {
  const { tokens } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const { cardRef, captureCard, shareInstagram, sharePng, saveToGallery, copy, sharing } = useShare();
  const { renderCard } = useShareCard();
  const styles = useThemedStyles((t) => ({
    container: {
      flex: 1,
      backgroundColor: t.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      gap: 18,
    },
    cardWrap: {
      transform: [{ scale: 0.95 }],
    },
    shareCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: t.colors.brandPurple,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
      minWidth: 160,
    },
    shareCtaText: {
      color: t.colors.onAccent, // over the purple-filled share button
      fontWeight: '800',
    },
  }));

  const card = useMemo(() => renderCard(data), [data, renderCard]);

  const capture = useCallback(async () => {
    return await captureCard();
  }, [captureCard]);

  return (
    <View style={styles.container}>
      <View style={styles.cardWrap}>
        <View ref={cardRef as any} collapsable={false}>
          {card}
        </View>
      </View>

      <Pressable style={styles.shareCta} onPress={() => setSheetVisible(true)} accessibilityRole="button">
        {/* icon/spinner over the purple-filled share button */}
        {sharing ? <ActivityIndicator color={tokens.colors.onAccent} /> : <Ionicons name="share-outline" size={18} color={tokens.colors.onAccent} />}
        <Text style={styles.shareCtaText}>{sharing ? 'Preparing…' : 'Share'}</Text>
      </Pressable>

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
          await sharePng(uri);
        }}
        onCopyLink={async () => {
          setSheetVisible(false);
          if (!link) return;
          await copy(link);
        }}
        onShareMore={async () => {
          setSheetVisible(false);
          const uri = await capture();
          if (!uri) return;
          await sharePng(uri);
        }}
        onSaveImage={async () => {
          setSheetVisible(false);
          const uri = await capture();
          if (!uri) return;
          await saveToGallery(uri);
        }}
      />
    </View>
  );
}



