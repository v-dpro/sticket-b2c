// MilestoneShareCard — the IG-story milestone export (batch 3 template).
// Dark-stage brand artifact: gradient wordmark, the milestone as a rotated
// stamp, one line of copy, perforated ADMIT sign-off.

import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import {
  MONO_SEMI,
  SHARE_DARK,
  ShareCardShell,
  ShareFooter,
  ShareMono,
} from './ShareCardShell';

interface MilestoneShareCardProps {
  badgeName: string;
  badgeIcon: string;
  badgeColor: string;
  description: string;
  username: string;
}

/** "50 Shows" → { number: "50", word: "SHOW" } — big-number stamps when the
 *  milestone is numeric; otherwise the badge icon + name carry the stamp. */
function stampParts(badgeName: string): { number: string; word: string } | null {
  const m = badgeName.match(/^(\d+)\s+(.+)$/);
  if (!m) return null;
  return { number: m[1]!, word: m[2]!.replace(/s$/i, '').toUpperCase() };
}

export function MilestoneShareCard({ badgeName, badgeIcon, description, username }: MilestoneShareCardProps) {
  const parts = stampParts(badgeName);
  const today = new Date()
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();

  return (
    <ShareCardShell>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <ShareMono>{username.toUpperCase()}</ShareMono>

        {/* The milestone, stamped. */}
        <View
          style={{
            borderWidth: 3,
            borderColor: SHARE_DARK.fg,
            borderRadius: 18,
            paddingHorizontal: 30,
            paddingVertical: 18,
            alignItems: 'center',
            gap: 2,
            transform: [{ rotate: '-4deg' }],
          }}
        >
          {parts ? (
            <>
              <Text
                style={{
                  fontFamily: MONO_SEMI,
                  fontSize: 12,
                  letterSpacing: 3,
                  color: SHARE_DARK.fg,
                }}
              >
                {parts.word}
              </Text>
              <Text
                style={{
                  fontSize: 84,
                  fontWeight: '800',
                  color: SHARE_DARK.fg,
                  fontVariant: ['tabular-nums'],
                  lineHeight: 90,
                }}
              >
                {parts.number}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name={badgeIcon as any} size={44} color={SHARE_DARK.fg} />
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '800',
                  color: SHARE_DARK.fg,
                  textAlign: 'center',
                  marginTop: 8,
                }}
              >
                {badgeName}
              </Text>
            </>
          )}
        </View>

        <Text
          style={{
            fontSize: 14,
            color: SHARE_DARK.mute,
            textAlign: 'center',
            lineHeight: 21,
            paddingHorizontal: 12,
          }}
        >
          {description}
        </Text>
      </View>

      <ShareFooter left={today} right="ADMIT ONE MORE" />
    </ShareCardShell>
  );
}
