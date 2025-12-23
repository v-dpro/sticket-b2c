import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SignupWarningProps {
  deadline: string;
}

export function SignupWarning({ deadline }: SignupWarningProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle" size={16} color="#F59E0B" />
      <Text style={styles.text}>Signup required by {deadline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: '#F59E0B',
  },
});


