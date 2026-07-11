import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { radius } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

type UserSearchInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  placeholder?: string;
  autoFocus?: boolean;
};

export function UserSearchInput({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search by username…',
  autoFocus = false,
}: UserSearchInputProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.inkAlt,
      borderRadius: radius.md,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    icon: {
      marginRight: 8,
    },
    input: {
      flex: 1,
      height: 44,
      color: t.colors.textHi,
      fontSize: 16,
    },
    clearButton: {
      padding: 4,
    },
  }));

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={tokens.colors.textLo} style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={tokens.colors.textLo}
        value={value}
        onChangeText={onChangeText}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable onPress={onClear} style={styles.clearButton} hitSlop={10}>
          <Ionicons name="close-circle" size={20} color={tokens.colors.textLo} />
        </Pressable>
      ) : null}
    </View>
  );
}
