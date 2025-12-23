import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface AddSeatViewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { section: string; row?: string; photo: { uri: string } }) => Promise<boolean>;
}

export function AddSeatViewModal({ visible, onClose, onSubmit }: AddSeatViewModalProps) {
  const [section, setSection] = useState('');
  const [row, setRow] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => section.trim().length > 0 && !!photoUri && !submitting, [section, photoUri, submitting]);

  const handlePick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (!res.canceled) {
      const uri = res.assets?.[0]?.uri;
      if (uri) setPhotoUri(uri);
    }
  };

  const handleSubmit = async () => {
    if (!photoUri) return;
    const cleanSection = section.trim();
    if (!cleanSection) return;

    setSubmitting(true);
    const ok = await onSubmit({
      section: cleanSection,
      row: row.trim() ? row.trim() : undefined,
      photo: { uri: photoUri },
    });
    setSubmitting(false);

    if (ok) {
      setSection('');
      setRow('');
      setPhotoUri(null);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Text style={styles.title}>Add Seat View</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.label}>Section</Text>
          <TextInput
            value={section}
            onChangeText={setSection}
            placeholder="e.g. 102, GA Floor, Balcony"
            placeholderTextColor="#6B6B8D"
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 16 }]}>Row (optional)</Text>
          <TextInput
            value={row}
            onChangeText={setRow}
            placeholder="e.g. 12"
            placeholderTextColor="#6B6B8D"
            style={styles.input}
          />

          <Pressable style={styles.pickButton} onPress={handlePick}>
            <Ionicons name={photoUri ? 'checkmark-circle' : 'image-outline'} size={18} color={photoUri ? '#22C55E' : '#00D4FF'} />
            <Text style={styles.pickText}>{photoUri ? 'Photo selected' : 'Pick a photo'}</Text>
          </Pressable>

          <Text style={styles.hint}>Tip: crop to show the stage and the overall view.</Text>
        </View>

        <View style={styles.footer}>
          <Pressable style={[styles.submitButton, !canSubmit && styles.submitDisabled]} onPress={handleSubmit} disabled={!canSubmit}>
            <LinearGradient
              colors={canSubmit ? ['#8B5CF6', '#E879F9'] : ['#2D2D4A', '#2D2D4A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            >
              {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>Upload</Text>}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1E',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D4A',
  },
  cancelText: {
    fontSize: 16,
    color: '#A0A0B8',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  label: {
    color: '#A0A0B8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    backgroundColor: '#1A1A2E',
    color: '#FFFFFF',
    padding: 12,
  },
  pickButton: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    backgroundColor: '#1A1A2E',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickText: {
    color: '#00D4FF',
    fontWeight: '600',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B6B8D',
  },
  footer: {
    padding: 24,
    paddingBottom: 40,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitDisabled: {
    opacity: 0.5,
  },
  gradient: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});



