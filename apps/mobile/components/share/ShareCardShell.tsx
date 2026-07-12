// ShareCardShell — the IG-story export frame (batch 3, C8).
// Share cards are BRAND ARTIFACTS, not UI: always dark-stage regardless of
// the app theme, 9:16, and the gradient wordmark is the sanctioned
// brand-mark moment. Everything inside uses fixed dark-palette values.

import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

export const SHARE_DARK = {
  bg: '#0B0B10',
  card: '#15151C',
  line: '#23232E',
  fg: '#FFFFFF',
  mute: '#A6A6B3',
  muteSoft: '#7C7C89',
  dash: '#3A3A46',
} as const;

const BRAND = ['#45E3FF', '#7C5CFF', '#EFA1EF'] as const;
export const MONO = 'JetBrainsMono';
export const MONO_SEMI = 'JetBrainsMono-Semi';
export const MONO_BOLD = 'JetBrainsMono-Bold';

/** The gradient wordmark — the one brand-mark moment on every export. */
export function ShareWordmark({ size = 17 }: { size?: number }) {
  return (
    <MaskedView
      maskElement={
        <Text style={{ fontSize: size, fontWeight: '800', color: '#000' }}>Sticket</Text>
      }
    >
      <LinearGradient colors={[...BRAND]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={{ fontSize: size, fontWeight: '800', opacity: 0 }}>Sticket</Text>
      </LinearGradient>
    </MaskedView>
  );
}

/** Mono uppercase data line for exports. */
export function ShareMono({
  children,
  size = 10.5,
  color = SHARE_DARK.muteSoft,
  weight = '600' as const,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  weight?: '400' | '600' | '700';
}) {
  return (
    <Text
      style={{
        fontFamily: weight === '700' ? MONO_BOLD : weight === '600' ? MONO_SEMI : MONO,
        fontVariant: ['tabular-nums'],
        fontSize: size,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color,
      }}
    >
      {children}
    </Text>
  );
}

/** Dashed perforation + mono footer — the stub sign-off on every export. */
export function ShareFooter({ left, right }: { left: string; right: string }) {
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          borderBottomWidth: 1,
          borderStyle: 'dashed',
          borderColor: SHARE_DARK.dash,
        }}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <ShareMono>{left}</ShareMono>
        <ShareMono>{right}</ShareMono>
      </View>
    </View>
  );
}

type ShareCardShellProps = {
  children: React.ReactNode;
  /** Right side of the wordmark row (e.g. a bare score). */
  headerRight?: React.ReactNode;
  /** Full-bleed layer painted UNDER the header and content (hero photos). */
  background?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** 9:16 dark-stage frame: absolute wordmark row on top, padded content. */
export function ShareCardShell({ children, headerRight, background, style }: ShareCardShellProps) {
  return (
    <View
      style={[
        {
          width: 350,
          height: 622,
          borderRadius: 24,
          overflow: 'hidden',
          backgroundColor: SHARE_DARK.bg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: SHARE_DARK.line,
        },
        style,
      ]}
    >
      {background}
      <View
        style={{
          position: 'absolute',
          top: 24,
          left: 26,
          right: 26,
          zIndex: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <ShareWordmark />
        {headerRight}
      </View>
      <View style={{ flex: 1, padding: 26, paddingTop: 66 }}>{children}</View>
    </View>
  );
}
