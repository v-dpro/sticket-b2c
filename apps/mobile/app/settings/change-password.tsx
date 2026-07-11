import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { PillButton } from '../../components/ui/PillButton';
import { SpringPressable } from '../../components/ui/SpringPressable';
import { changePassword } from '../../lib/api/settings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function ChangePasswordScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

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
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    input: { flex: 1, height: 48, color: t.colors.fg, fontSize: 15, fontWeight: '500' },
    hint: { fontSize: 12, color: t.colors.mute, marginTop: 6, fontWeight: '400' },
    submitWrap: { marginTop: t.spacing.lg },
  }));

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Your password has been changed', [{ text: 'OK', onPress: goBack }]);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to change password');
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
        <Text style={styles.title}>Change Password</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>Enter your current password and choose a new password.</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Current Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter current password"
              placeholderTextColor={tokens.colors.muteSoft}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrent}
            />
            <SpringPressable onPress={() => setShowCurrent((v) => !v)} haptic="light" accessibilityRole="button">
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color={tokens.colors.mute} />
            </SpringPressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={tokens.colors.muteSoft}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNew}
            />
            <SpringPressable onPress={() => setShowNew((v) => !v)} haptic="light" accessibilityRole="button">
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color={tokens.colors.mute} />
            </SpringPressable>
          </View>
          <Text style={styles.hint}>At least 8 characters</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Confirm new password"
              placeholderTextColor={tokens.colors.muteSoft}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNew}
            />
          </View>
        </View>

        <View style={styles.submitWrap}>
          <PillButton
            title={loading ? 'Changing…' : 'Change Password'}
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
