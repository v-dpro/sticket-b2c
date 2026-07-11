import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { changeEmail } from '../../lib/api/settings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function ChangeEmailScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: 12,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.3 },
    scrollView: { flex: 1, padding: t.density.pad },
    description: {
      fontSize: 14,
      color: t.colors.textSoft,
      marginBottom: t.spacing.lg,
      fontWeight: '400',
      lineHeight: 20,
    },
    inputGroup: { marginBottom: t.spacing.md },
    label: { fontSize: 13, fontWeight: '600', color: t.colors.fg, marginBottom: 8 },
    inputContainer: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    input: { height: 48, color: t.colors.fg, fontSize: 15, fontWeight: '500' },
    submitWrap: { marginTop: t.spacing.lg },
  }));

  const handleSubmit = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await changeEmail(email, password);
      Alert.alert('Success', res.message || 'Your email has been changed', [{ text: 'OK', onPress: goBack }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to change email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Change Email</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>Enter your new email and confirm with your password.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Email</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={tokens.colors.muteSoft}
              value={newEmail}
              onChangeText={setNewEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={tokens.colors.muteSoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
        </View>

        <View style={styles.submitWrap}>
          <PillButton
            title={loading ? 'Changing…' : 'Change Email'}
            variant="primary"
            size="lg"
            onPress={() => void handleSubmit()}
            disabled={loading}
            springFeedback
            haptic="medium"
          />
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
