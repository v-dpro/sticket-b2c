// FlowHeader — the log-flow modal header: leading icon button (back for
// mid-flow steps, none for sheet-style entry screens where swipe-down
// dismisses), a centered mono step label, and an optional right-aligned
// mono text action (e.g. "SKIP") for semantics-carrying exits. Every
// log-flow screen hides the native stack header and renders this instead.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';
import { SpringPressable } from '../ui/SpringPressable';

type FlowHeaderProps = {
  /** Leading button glyph. 'back' mid-flow; 'none' on modal entry screens
      (dismissal is the native swipe-down, hinted by the grabber). */
  icon: 'close' | 'back' | 'none';
  /** Mono eyebrow label, rendered uppercase (e.g. "LOG A SHOW"). */
  label: string;
  /** Leading-button handler. Required unless icon is 'none'. */
  onPress?: () => void;
  /** Right-aligned mono text action (uppercase), e.g. "SKIP". */
  actionLabel?: string;
  onAction?: () => void;
  /** Centered grabber bar above the row — the swipe-down-to-dismiss hint. */
  grabber?: boolean;
};

export function FlowHeader({ icon, label, onPress, actionLabel, onAction, grabber }: FlowHeaderProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <>
      {grabber ? (
        <View
          style={{
            alignSelf: 'center',
            width: 38,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.line,
            marginTop: 8,
          }}
        />
      ) : null}

      <View
        style={{
          height: 52,
          paddingHorizontal: tokens.density.pad,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {icon === 'none' ? (
          <View style={{ width: 36, height: 36 }} />
        ) : (
          <SpringPressable
            onPress={onPress ?? (() => {})}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={icon === 'close' ? 'Close' : 'Back'}
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}
          >
            <Ionicons name={icon === 'close' ? 'close' : 'arrow-back'} size={22} color={c.fg} />
          </SpringPressable>
        )}

        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 10.5,
            fontWeight: '600',
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: c.muteSoft,
          }}
        >
          {label}
        </Text>

        {actionLabel ? (
          <SpringPressable
            onPress={onAction ?? (() => {})}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={{ minWidth: 36, height: 36, alignItems: 'flex-end', justifyContent: 'center', marginRight: -2 }}
          >
            <Text
              style={{
                fontFamily: tokens.fontFamilies.mono,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: c.muteSoft,
              }}
            >
              {actionLabel}
            </Text>
          </SpringPressable>
        ) : (
          <View style={{ width: 36, height: 36 }} />
        )}
      </View>
    </>
  );
}
