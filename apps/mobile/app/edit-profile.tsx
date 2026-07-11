import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

import { SpringPressable } from '../components/ui/SpringPressable';
import { updateProfile as updateRemoteProfile, uploadAvatar } from '../lib/api/profile';
import { useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';
import { useSessionStore } from '../stores/sessionStore';
import { useSafeBack } from '../lib/navigation/safeNavigation';
import { useTheme, useThemedStyles } from '../lib/theme-context';

export default function EditProfileScreen() {
  const { user } = useSession();
  const { tokens } = useTheme();
  const refreshSession = useSessionStore((s) => s.refresh);
  const goBack = useSafeBack();

  const { profile, loading: profileLoading, refetch } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newAvatar, setNewAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.bg },
    loadingContainer: { flex: 1, backgroundColor: t.colors.bg, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    cancelText: { fontSize: 16, color: t.colors.mute },
    headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, color: t.colors.fg },
    saveText: { fontSize: 16, fontWeight: '700', color: t.colors.accent },
    saveTextDisabled: { color: t.colors.muteSoft },
    content: { flex: 1 },
    scrollContent: { padding: 24 },
    avatarContainer: { alignSelf: 'center', position: 'relative', marginBottom: 8 },
    avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: t.colors.line },
    avatarPlaceholder: { backgroundColor: t.colors.card2, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 36, fontWeight: '800', color: t.colors.fg },
    avatarEditBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: t.colors.inverseBg,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: t.colors.bg,
    },
    changePhotoText: { textAlign: 'center', color: t.colors.accent, fontSize: 14, fontWeight: '600', marginBottom: 32 },
    form: { gap: 20 },
    inputGroup: { marginBottom: 4 },
    label: {
      fontFamily: t.fontFamilies.mono,
      fontSize: 10.5,
      fontWeight: '600',
      color: t.colors.mute,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 2,
    },
    input: {
      backgroundColor: t.colors.card,
      borderRadius: t.radius.md,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: t.colors.fg,
      fontSize: 16,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    bioInput: { minHeight: 80, paddingTop: 14, textAlignVertical: 'top' },
    charCount: { fontSize: 12, color: t.colors.muteSoft, textAlign: 'right', marginTop: 4 },
  }));

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setCity(profile.city || '');
    setAvatarUrl(profile.avatarUrl || '');
  }, [profile]);

  const canSave = useMemo(() => !!username.trim() && !saving, [username, saving]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission Required', 'We need access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setNewAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    if (!canSave) return;

    setSaving(true);
    try {
      let finalAvatarUrl = avatarUrl;

      // Upload new avatar if changed
      if (newAvatar) {
        const { avatarUrl: uploadedUrl } = await uploadAvatar({
          uri: newAvatar,
          type: 'image/jpeg',
          name: 'avatar.jpg',
        });
        finalAvatarUrl = uploadedUrl;
      }

      const normalizedUsername = username.trim().toLowerCase();

      // Update remote profile
      await updateRemoteProfile({
        displayName: displayName.trim() || undefined,
        username: normalizedUsername,
        bio: bio.trim() || undefined,
        city: city.trim() || undefined,
        avatarUrl: finalAvatarUrl || undefined,
      });

      await refreshSession();
      await refetch();

      goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = goBack;

  if (profileLoading || !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.mute} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <SpringPressable onPress={handleCancel} haptic="light" accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </SpringPressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <SpringPressable onPress={handleSave} disabled={!canSave} haptic="medium" accessibilityRole="button">
          {saving ? (
            <ActivityIndicator size="small" color={tokens.colors.mute} />
          ) : (
            <Text style={[styles.saveText, !canSave && styles.saveTextDisabled]}>Save</Text>
          )}
        </SpringPressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Avatar */}
        <SpringPressable style={styles.avatarContainer} onPress={handlePickAvatar} haptic="light" accessibilityRole="button">
          {newAvatar || avatarUrl ? (
            <Image source={{ uri: newAvatar || avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{(displayName || username).charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={16} color={tokens.colors.inverseFg} />
          </View>
        </SpringPressable>
        <Text style={styles.changePhotoText}>Change photo</Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={tokens.colors.muteSoft}
              maxLength={50}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={(text) => setUsername(text.toLowerCase())}
              placeholder="username"
              placeholderTextColor={tokens.colors.muteSoft}
              autoCapitalize="none"
              maxLength={20}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell us about yourself..."
              placeholderTextColor={tokens.colors.muteSoft}
              multiline
              numberOfLines={3}
              maxLength={160}
            />
            <Text style={styles.charCount}>{bio.length}/160</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="Where are you based?"
              placeholderTextColor={tokens.colors.muteSoft}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
