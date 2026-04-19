import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

import { updateProfile as updateRemoteProfile, uploadAvatar } from '../lib/api/profile';
import { useProfile } from '../hooks/useProfile';
import { useSession } from '../hooks/useSession';
import { useSessionStore } from '../stores/sessionStore';
import { updateProfile as updateLocalProfile } from '../lib/local/repo/profileRepo';
import { useSafeBack } from '../lib/navigation/safeNavigation';
import { colors, radius, spacing } from '../lib/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user } = useSession();
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

      // Keep local profile in sync (used by onboarding/local flows)
      await updateLocalProfile(user.id, {
        displayName: displayName.trim() || null,
        username: normalizedUsername || null,
        bio: bio.trim() || null,
        city: city.trim() || null,
        avatarUrl: finalAvatarUrl || null,
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
        <ActivityIndicator size="large" color={colors.brandCyan} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <Pressable onPress={handleSave} disabled={!canSave}>
          {saving ? <ActivityIndicator size="small" color={colors.brandCyan} /> : <Text style={styles.saveText}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Avatar */}
        <Pressable style={styles.avatarContainer} onPress={handlePickAvatar}>
          {newAvatar || avatarUrl ? (
            <Image source={{ uri: newAvatar || avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{(displayName || username).charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={16} color={colors.textHi} />
          </View>
        </Pressable>
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
              placeholderTextColor={colors.textLo}
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
              placeholderTextColor={colors.textLo}
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
              placeholderTextColor={colors.textLo}
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
              placeholderTextColor={colors.textLo}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  cancelText: {
    fontSize: 16,
    color: colors.textMid,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '400',
    letterSpacing: -0.6,
    color: colors.textHi,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brandCyan,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.brandCyan,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.brandCyan,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandCyan,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.ink,
  },
  changePhotoText: {
    textAlign: 'center',
    color: colors.brandCyan,
    fontSize: 14,
    marginBottom: 32,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textLo,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.textHi,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  bioInput: {
    minHeight: 80,
    paddingTop: 14,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: colors.textLo,
    textAlign: 'right',
    marginTop: 4,
  },
});




