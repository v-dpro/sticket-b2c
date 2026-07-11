import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QRCodeDisplay } from '../../components/friends/QRCodeDisplay';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function FindFriendsQrCodeScreen() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { tokens } = useTheme();
  // The QR/scan surface itself is rendered (and kept fixed white) inside <QRCodeDisplay />.
  const styles = useThemedStyles((t) => ({
    container: { flex: 1, backgroundColor: t.colors.ink },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 8,
    },
    backButton: { width: 40, height: 40, justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '800', color: t.colors.textHi },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={tokens.colors.textHi} />
        </Pressable>
        <Text style={styles.title}>My QR Code</Text>
        <View style={{ width: 40 }} />
      </View>

      <QRCodeDisplay />
    </SafeAreaView>
  );
}




