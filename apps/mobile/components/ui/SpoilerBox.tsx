import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, fontFamilies } from '../../lib/theme';

type SpoilerBoxProps = {
  label?: string; // default "Spoiler"
  sub?: string; // subtitle text
  children: ReactNode;
};

export function SpoilerBox({ label = 'Spoiler', sub, children }: SpoilerBoxProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <View style={styles.wrapper}>
      {/* Children — always rendered, opacity controlled */}
      <View style={{ opacity: revealed ? 1 : 0.15 }} pointerEvents={revealed ? 'auto' : 'none'}>
        {children}
      </View>

      {/* Overlay when hidden */}
      {!revealed && (
        <View style={styles.overlay}>
          <Text style={styles.emoji}>🤫</Text>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          <Pressable style={styles.revealButton} onPress={() => setRevealed(true)}>
            <Text style={styles.revealText}>TAP TO REVEAL</Text>
          </Pressable>
        </View>
      )}

      {/* Hide button when revealed */}
      {revealed && (
        <Pressable style={styles.hideButton} onPress={() => setRevealed(false)}>
          <Text style={styles.hideText}>✕ HIDE</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11,11,20,0.7)',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emoji: {
    fontSize: 20,
  },
  label: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.textHi,
    letterSpacing: 1.5,
  },
  sub: {
    fontSize: 12,
    color: colors.textLo,
    lineHeight: 12 * 1.4,
    maxWidth: 260,
    textAlign: 'center',
  },
  revealButton: {
    backgroundColor: colors.brandCyan,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  revealText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1.3,
  },
  hideButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  hideText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.textHi,
    letterSpacing: 1.2,
  },
});
