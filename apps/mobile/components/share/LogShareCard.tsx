// LogShareCard — the IG-story MEMORY export (batch 3 template).
// Photo-first: the night's photo fills the frame, bare score top-right,
// artist + "#N of my M nights" over the scrim, stub details sign-off.
// Always dark-stage (brand artifact) regardless of app theme.

import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatScore } from '../timeline/format';
import { MONO_BOLD, SHARE_DARK, ShareCardShell, ShareFooter } from './ShareCardShell';

interface LogShareCardProps {
  artistName: string;
  artistImage?: string;
  venueName: string;
  venueCity: string;
  date: string;
  rating?: number;
  photo?: string;
  username: string;
  /** "#3 of my 47 nights" — rendered when both are known. */
  rank?: number;
  totalNights?: number;
}

export function LogShareCard({
  artistName,
  artistImage,
  venueName,
  venueCity,
  date,
  rating,
  photo,
  username,
  rank,
  totalNights,
}: LogShareCardProps) {
  const hero = photo ?? artistImage;
  const formattedDate = new Date(date)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();

  return (
    <ShareCardShell
      headerRight={
        typeof rating === 'number' ? (
          <Text
            style={{
              fontFamily: MONO_BOLD,
              fontVariant: ['tabular-nums'],
              fontSize: 40,
              color: '#FFFFFF',
              letterSpacing: -1,
              textShadowColor: 'rgba(11,11,16,0.5)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 8,
            }}
          >
            {formatScore(rating)}
          </Text>
        ) : undefined
      }
      background={
        <View style={StyleSheet.absoluteFillObject}>
          {hero ? (
            <Image source={{ uri: hero }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: SHARE_DARK.card }]} />
          )}
          <LinearGradient
            colors={['rgba(11,11,16,0.35)', 'rgba(11,11,16,0)', 'rgba(11,11,16,0.88)']}
            locations={[0, 0.35, 1]}
            style={StyleSheet.absoluteFillObject}
          />
        </View>
      }
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', gap: 14 }}>
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#FFFFFF' }} numberOfLines={2}>
            {artistName}
          </Text>
          {rank && totalNights ? (
            <Text style={{ fontSize: 13.5, color: '#C9C9D4' }}>
              #{rank} of my {totalNights} nights
            </Text>
          ) : (
            <Text style={{ fontSize: 13.5, color: '#C9C9D4' }}>@{username}</Text>
          )}
        </View>
        <ShareFooter
          left={[venueName, venueCity].filter(Boolean).join(', ').toUpperCase()}
          right={formattedDate}
        />
      </View>
    </ShareCardShell>
  );
}
