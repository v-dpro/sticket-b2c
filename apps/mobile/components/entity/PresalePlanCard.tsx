// PresalePlanCard — the "how to plan for this presale" block on the event
// screen. Upgrades the informational PresaleCard (type + window + notes)
// with everything needed to actually act on it: generated step-by-step
// instructions, a Set alert toggle (usePresales' toggleAlert), and a Get
// tickets action that opens the shared FindTicketsSheet.
//
// Compliance: presale CODES are never rendered or copyable here — the
// instructions only ever say "have your presale code ready", never a code
// (see lib/presales/instructions.ts / hooks/usePresales.ts).

import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { EventPresale } from '../../lib/api/events';
import { presaleInstructions } from '../../lib/presales/instructions';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { presaleTiming } from '../explore/format';
import { PillButton } from '../ui/PillButton';
import { SpringPressable } from '../ui/SpringPressable';

type PresalePlanCardProps = {
  presales: EventPresale[];
  onToggleAlert: (presale: EventPresale) => void;
  onGetTickets: (presale: EventPresale) => void;
};

export function PresalePlanCard({ presales, onToggleAlert, onGetTickets }: PresalePlanCardProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    card: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.hairline,
    },
    row: {
      paddingHorizontal: t.density.cardPad,
      paddingVertical: 14,
      gap: 12,
    },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: t.colors.hairline },
    type: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.mute,
    },
    window: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 12,
      color: t.colors.text,
    },
    notes: { fontSize: 12.5, color: t.colors.mute, lineHeight: 18 },
    steps: { gap: 8, marginTop: 2 },
    stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    stepNum: {
      fontFamily: t.fontFamilies.monoSemi,
      fontVariant: ['tabular-nums'],
      fontSize: 11,
      color: t.colors.muteSoft,
      width: 16,
      lineHeight: 18,
    },
    stepText: { flex: 1, fontSize: 13, color: t.colors.text, lineHeight: 18 },
    stepLink: { textDecorationLine: 'underline', color: t.colors.fg },
    actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  }));

  return (
    <View style={styles.card}>
      {presales.map((p, i) => {
        const steps = presaleInstructions(p);
        const signupStepIndex = p.signupUrl || p.signupDeadline ? 0 : -1;

        return (
          <View key={p.id}>
            {i > 0 ? <View style={styles.divider} /> : null}
            <View style={styles.row}>
              {/* Some feeds already end the type with "presale" — don't double it. */}
              <Text style={styles.type}>{`${p.presaleType.replace(/\s*presale\s*$/i, '')} presale`}</Text>
              <Text style={styles.window}>{presaleTiming(p.presaleStart, p.presaleEnd)}</Text>
              {p.notes ? <Text style={styles.notes}>{p.notes}</Text> : null}

              <View style={styles.steps}>
                {steps.map((step, idx) => {
                  const isSignupStep = idx === signupStepIndex && !!p.signupUrl;
                  return isSignupStep ? (
                    <SpringPressable
                      key={idx}
                      style={styles.stepRow}
                      haptic="light"
                      onPress={() => void Linking.openURL(p.signupUrl!).catch(() => {})}
                      accessibilityRole="button"
                      accessibilityLabel={step}
                    >
                      <Text style={styles.stepNum}>{`0${idx + 1}`}</Text>
                      <Text style={[styles.stepText, styles.stepLink]}>{step}</Text>
                    </SpringPressable>
                  ) : (
                    <View key={idx} style={styles.stepRow}>
                      <Text style={styles.stepNum}>{`0${idx + 1}`}</Text>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={styles.actionRow}>
                <PillButton
                  title={p.hasAlert ? 'Alert on' : 'Set alert'}
                  variant="secondary"
                  springFeedback
                  haptic="light"
                  icon={
                    <Ionicons
                      name={p.hasAlert ? 'notifications' : 'notifications-outline'}
                      size={13}
                      color={p.hasAlert ? tokens.colors.fg : tokens.colors.mute}
                    />
                  }
                  onPress={() => onToggleAlert(p)}
                />
                <PillButton
                  title="Get tickets"
                  variant="primary"
                  springFeedback
                  haptic="light"
                  icon={<Ionicons name="open-outline" size={13} color={tokens.colors.inverseFg} />}
                  onPress={() => onGetTickets(p)}
                />
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
