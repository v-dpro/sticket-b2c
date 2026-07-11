// LogField — themed text input for the log flow: mono eyebrow label,
// card-surface field, accent border on focus (small active-state usage).

import { useState, type ComponentProps } from 'react';
import { Text, TextInput, View } from 'react-native';

import { useTheme } from '../../lib/theme-context';

type LogFieldProps = ComponentProps<typeof TextInput> & {
  label?: string;
  errorText?: string;
  /** Render input text in the mono family (dates, seat numbers). */
  mono?: boolean;
  /** Tighter 44pt height for inline field rows. */
  compact?: boolean;
};

export function LogField({ label, errorText, mono = false, compact = false, style, ...props }: LogFieldProps) {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 7 }}>
      {label ? (
        <Text
          style={{
            fontFamily: tokens.fontFamilies.mono,
            fontSize: 10.5,
            fontWeight: '600',
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: c.mute,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={c.muteSoft}
        selectionColor={c.accent}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          {
            height: compact ? 44 : 48,
            borderRadius: tokens.radius.md,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: errorText ? c.error : focused ? c.accentLine : c.hairline,
            paddingHorizontal: 14,
            color: c.fg,
            fontSize: 15,
            fontWeight: '400',
            ...(mono ? { fontFamily: tokens.fontFamilies.mono, fontVariant: ['tabular-nums' as const] } : null),
          },
          style,
        ]}
        {...props}
      />
      {errorText ? (
        <Text style={{ color: c.error, fontSize: 12, fontWeight: '400' }}>{errorText}</Text>
      ) : null}
    </View>
  );
}
