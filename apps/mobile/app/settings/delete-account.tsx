import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Screen } from '../../components/ui/Screen';
import { useAccountActions } from '../../hooks/useAccountActions';
import { colors, radius, spacing } from '../../lib/theme';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { deleteAccount, loading } = useAccountActions();
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

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

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Delete Account</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.warningBox}>
          <Ionicons name="warning" size={22} color={colors.error} />
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
            placeholderTextColor={colors.textTertiary}
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
            placeholderTextColor={colors.textTertiary}
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
            placeholderTextColor={colors.textTertiary}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
          />
        </View>

        <Pressable
          style={[styles.deleteButton, (loading || confirmText !== 'DELETE') && styles.deleteButtonDisabled]}
          onPress={handleDelete}
          disabled={loading || confirmText !== 'DELETE'}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={colors.textPrimary} />
          ) : (
            <>
              <Ionicons name="trash" size={18} color={colors.textPrimary} />
              <Text style={styles.deleteText}>Delete My Account</Text>
            </>
          )}
        </Pressable>

        <Text style={styles.finalWarning}>This action is permanent and cannot be undone.</Text>

        <View style={{ height: 80 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: spacing.lg,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.error,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: radius.md,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: colors.error,
    lineHeight: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  deleteList: {
    gap: 8,
  },
  deleteItem: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  finalWarning: {
    fontSize: 12,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.md,
    fontWeight: '700',
  },
});



