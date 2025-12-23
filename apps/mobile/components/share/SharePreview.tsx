import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { ShareCardData } from '../../types/share';

import { useShare } from '../../hooks/useShare';
import { useShareCard } from '../../hooks/useShareCard';
import { ShareSheet } from './ShareSheet';

interface SharePreviewProps {
  data: ShareCardData;
  link?: string;
}

export function SharePreview({ data, link }: SharePreviewProps) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const { cardRef, captureCard, shareInstagram, sharePng, saveToGallery, copy, sharing } = useShare();
  const { renderCard } = useShareCard();

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
        {sharing ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="share-outline" size={18} color="#FFFFFF" />}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1E',
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
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 160,
  },
  shareCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});



