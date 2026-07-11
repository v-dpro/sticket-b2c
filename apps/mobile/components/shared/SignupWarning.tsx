import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

interface SignupWarningProps {
  deadline: string;
}

export function SignupWarning({ deadline }: SignupWarningProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    text: {
      fontSize: 13,
      fontWeight: '600',
      color: t.colors.warning,
    },
  }));

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={16} color={tokens.colors.warning} />
      <Text style={styles.text}>Signup required by {deadline}</Text>
    </View>
  );
}
