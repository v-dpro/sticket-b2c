import { Stack } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useAccountActions } from '../../hooks/useAccountActions';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function DeleteAccountScreen() {
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  const { deleteAccount, loading } = useAccountActions();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

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
    title: { fontSize: 20, fontWeight: '800', color: t.colors.error, letterSpacing: -0.3 },
    scrollView: { flex: 1, padding: t.density.pad },
    warningBox: {
      flexDirection: 'row',
      backgroundColor: t.isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(220, 38, 38, 0.08)',
      borderRadius: t.radius.md,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: t.isDark ? 'rgba(239, 68, 68, 0.30)' : 'rgba(220, 38, 38, 0.28)',
      marginBottom: t.spacing.lg,
    },
    warningText: { flex: 1, fontSize: 14, color: t.colors.error, lineHeight: 20, fontWeight: '600' },
    section: { marginBottom: t.spacing.lg },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: t.colors.fg, marginBottom: t.spacing.sm },
    deleteList: { gap: 8 },
    deleteItem: { fontSize: 14, color: t.colors.textSoft, fontWeight: '400' },
    inputGroup: { marginBottom: t.spacing.md },
    label: { fontSize: 13, fontWeight: '600', color: t.colors.fg, marginBottom: 8 },
    input: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: t.colors.fg,
      fontSize: 15,
      fontWeight: '500',
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    deleteButton: {
      flexDirection: 'row',
      backgroundColor: t.colors.error,
      borderRadius: t.radius.full,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: t.spacing.lg,
    },
    deleteButtonDisabled: { opacity: 0.5 },
    deleteText: { fontSize: 15, fontWeight: '700', color: t.colors.white },
    finalWarning: {
      fontSize: 12,
      color: t.colors.error,
      textAlign: 'center',
      marginTop: t.spacing.md,
      fontWeight: '500',
    },
  }));

  const handleDelete = () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    if (confirmText !== 'DELETE') {
      Alert.alert('Error', 'Please type DELETE to confirm');
      return;
    }

    Alert.alert('Delete Account', 'This action cannot be undone. All your data will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete Forever',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount(password, reason);
          } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.error || err?.message || 'Failed to delete account');
          }
        },
      },
    ]);
  };

  const disabled = loading || confirmText !== 'DELETE';

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable onPress={goBack} haptic="light" style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={22} color={tokens.colors.error} />
          <Text style={styles.warningText}>
            Deleting your account will permanently remove all your data, including your concert history, photos, and social connections.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What will be deleted:</Text>
          <View style={styles.deleteList}>
            <Text style={styles.deleteItem}>• All your concert logs and photos</Text>
            <Text style={styles.deleteItem}>• Your profile and settings</Text>
            <Text style={styles.deleteItem}>• Your followers and following</Text>
            <Text style={styles.deleteItem}>• Your ticket wallet</Text>
            <Text style={styles.deleteItem}>• Your badges and achievements</Text>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Why are you leaving? (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Help us improve…"
            placeholderTextColor={tokens.colors.muteSoft}
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Enter your password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={tokens.colors.muteSoft}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Type DELETE to confirm</Text>
          <TextInput
            style={styles.input}
            placeholder="DELETE"
            placeholderTextColor={tokens.colors.muteSoft}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />
        </View>

        <SpringPressable
          style={[styles.deleteButton, disabled && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={disabled}
          haptic="heavy"
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={tokens.colors.white} />
          ) : (
            <>
              <Ionicons name="trash" size={18} color={tokens.colors.white} />
              <Text style={styles.deleteText}>Delete My Account</Text>
            </>
          )}
        </SpringPressable>

        <Text style={styles.finalWarning}>This action is permanent and cannot be undone.</Text>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
