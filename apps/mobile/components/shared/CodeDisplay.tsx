import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { fontFamilies } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface CodeDisplayProps {
  code: string;
  onCopy?: () => void;
}

export function CodeDisplay({ code, onCopy }: CodeDisplayProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      gap: 8,
    },
    label: {
      fontSize: 12,
      color: t.colors.textMid,
    },
    codeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: t.colors.inverseBg,
    },
    code: {
      fontSize: 14,
      fontWeight: '700',
      fontFamily: fontFamilies.monoBold,
      color: t.colors.inverseFg,
    },
  }));

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    onCopy?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Code:</Text>
      <TouchableOpacity onPress={handleCopy} style={styles.codeContainer} activeOpacity={0.8}>
        <Text style={styles.code}>{code}</Text>
        <Ionicons name="copy-outline" size={14} color={tokens.colors.onAccent} />
      </TouchableOpacity>
    </View>
  );
}
