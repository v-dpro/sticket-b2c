import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

interface CodeDisplayProps {
  code: string;
  onCopy?: () => void;
}

export function CodeDisplay({ code, onCopy }: CodeDisplayProps) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    onCopy?.();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Code:</Text>
      <TouchableOpacity onPress={handleCopy} style={styles.codeContainer} activeOpacity={0.8}>
        <Text style={styles.code}>{code}</Text>
        <Ionicons name="copy-outline" size={14} color={colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.brandPurple,
  },
  code: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'monospace',
    color: colors.textPrimary,
  },
});


