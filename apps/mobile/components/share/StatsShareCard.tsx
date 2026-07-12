// StatsShareCard — the IG-story STATS export (batch 3 Wrapped-style
// template). Dark-stage brand artifact: giant year mark, mono stat rows,
// perforated "one more year" sign-off.

import React from 'react';
import { Text, View } from 'react-native';

import {
  MONO_BOLD,
  SHARE_DARK,
  ShareCardShell,
  ShareFooter,
  ShareMono,
} from './ShareCardShell';

interface StatsShareCardProps {
  username: string;
  avatar?: string;
  showCount: number;
  artistCount: number;
  venueCount: number;
  topArtist?: string;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: SHARE_DARK.line,
      }}
    >
      <ShareMono>{label}</ShareMono>
      <Text
        style={{
          fontFamily: MONO_BOLD,
          fontVariant: ['tabular-nums'],
          fontSize: 26,
          color: SHARE_DARK.fg,
          letterSpacing: -0.5,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function StatsShareCard({ username, showCount, artistCount, venueCount, topArtist }: StatsShareCardProps) {
  const year = String(new Date().getFullYear()).slice(-2);

  return (
    <ShareCardShell>
      <View style={{ flex: 1, justifyContent: 'center', gap: 28 }}>
        <View style={{ gap: 8 }}>
          <Text
            style={{
              fontSize: 96,
              fontWeight: '800',
              color: SHARE_DARK.fg,
              letterSpacing: -3,
              lineHeight: 100,
            }}
          >
            {'’'}{year}
          </Text>
          <ShareMono>{`SO FAR · ${username.toUpperCase()}`}</ShareMono>
        </View>

        <View>
          <StatRow label="SHOWS" value={String(showCount)} />
          <StatRow label="ARTISTS" value={String(artistCount)} />
          <StatRow label="VENUES" value={String(venueCount)} />
          {topArtist ? <StatRow label="MOST SEEN" value={topArtist} /> : null}
        </View>
      </View>

      <ShareFooter left={`STICKET '${year}`} right="ADMIT ONE MORE YEAR" />
    </ShareCardShell>
  );
}
