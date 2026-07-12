// CrowdMosaic — the 2-col crowd-post grid, the connective tissue between
// the stanza's entity cards (C14). Each tile: photo, small BareScore
// top-right when scored (C2 on-media body), bottom scrim with artist
// 13/700 + mono byline ("MAYA" · appends "VIA FRIENDS+" at degree 2).
// Tap → /memory/[logId] (the floating viewer).

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import type { ExploreCrowdPost } from '../../lib/api/explore';
import { useThemedStyles } from '../../lib/theme-context';
import { BareScore } from '../ui/Stub';
import { SpringPressable } from '../ui/SpringPressable';
import { crowdPostByline } from './format';

// Over-photo constants (theme-independent — they overlay the image).
const SCRIM_COLORS = ['rgba(11,11,16,0)', 'rgba(11,11,16,0.88)'] as const;
const SCRIM_LOCATIONS = [0.45, 1] as const;
const OVERLAY_MUTE = '#C9C9D4';

type CrowdMosaicProps = {
  posts: ExploreCrowdPost[];
  /** Mono section label above the grid (e.g. "FROM THE CROWD"). */
  title?: string;
};

export function CrowdMosaic({ posts, title }: CrowdMosaicProps) {
  const router = useRouter();
  const styles = useThemedStyles((t) => ({
    head: { paddingHorizontal: t.density.pad, marginBottom: 10 },
    title: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
    grid: {
      paddingHorizontal: t.density.pad,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 8,
    },
    tile: {
      width: '48.75%',
      aspectRatio: 0.8,
      borderRadius: t.radius.stub,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
      backgroundColor: t.colors.card2,
      overflow: 'hidden',
    },
    photo: { ...StyleSheet.absoluteFillObject },
    scrim: { ...StyleSheet.absoluteFillObject },
    score: { position: 'absolute', top: 10, right: 12 },
    bottomBlock: { position: 'absolute', left: 12, right: 12, bottom: 10, gap: 2 },
    artist: { fontSize: 13, fontWeight: '700', letterSpacing: -0.2, color: '#FFFFFF' },
    byline: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 9,
      fontWeight: '600',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: OVERLAY_MUTE,
    },
  }));

  if (posts.length === 0) return null;

  return (
    <View>
      {title ? (
        <View style={styles.head}>
          <Text style={styles.title}>{title}</Text>
        </View>
      ) : null}
      <View style={styles.grid}>
        {posts.map((post) => (
          <SpringPressable
            key={post.logId}
            haptic="light"
            onPress={() => router.push(`/memory/${post.logId}`)}
            accessibilityRole="button"
            accessibilityLabel={`${post.artistName} memory by ${post.user.username}`}
            style={styles.tile}
          >
            <Image
              source={{ uri: post.photoUrl }}
              style={styles.photo}
              contentFit="cover"
              transition={80}
              cachePolicy="memory-disk"
              recyclingKey={post.logId}
            />
            <LinearGradient
              colors={SCRIM_COLORS}
              locations={SCRIM_LOCATIONS}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.scrim}
              pointerEvents="none"
            />
            {typeof post.score === 'number' ? (
              <View style={styles.score} pointerEvents="none">
                <BareScore score={post.score} size={17} />
              </View>
            ) : null}
            <View style={styles.bottomBlock} pointerEvents="none">
              <Text style={styles.artist} numberOfLines={1}>
                {post.artistName}
              </Text>
              <Text style={styles.byline} numberOfLines={1}>
                {crowdPostByline(post.user)}
              </Text>
            </View>
          </SpringPressable>
        ))}
      </View>
    </View>
  );
}
