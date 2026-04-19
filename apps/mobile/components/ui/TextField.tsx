import type { ComponentProps } from 'react';
import { Text, TextInput, View } from 'react-native';

import { colors, radius } from '../../lib/theme';

type TextFieldProps = ComponentProps<typeof TextInput> & {
  label?: string;
  errorText?: string;
};

export function TextField({ label, errorText, style, ...props }: TextFieldProps) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: colors.textMid, fontSize: 14 }}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textLo}
        selectionColor={colors.brandCyan}
        style={[
          {
            height: 48,
            borderRadius: radius.sm,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: errorText ? colors.error : colors.hairline,
            paddingHorizontal: 12,
            color: colors.textHi,
            fontSize: 16,
          },
          style,
        ]}
        {...props}
      />
      {errorText ? <Text style={{ color: colors.error, fontSize: 12 }}>{errorText}</Text> : null}
    </View>
  );
}



