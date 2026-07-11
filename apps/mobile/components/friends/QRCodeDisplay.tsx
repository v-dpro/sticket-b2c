import QRCode from 'react-native-qrcode-svg';
import { Text, View } from 'react-native';

import { useQRCode } from '../../hooks/useQRCode';
import { radius } from '../../lib/theme';
import { useThemedStyles } from '../../lib/theme-context';

export function QRCodeDisplay() {
  const { data, value } = useQRCode();
  const styles = useThemedStyles((t) => ({
    container: {
      alignItems: 'center',
      padding: 24,
    },
    qrContainer: {
      backgroundColor: t.colors.white, // QR must sit on a true-white frame in both themes
      padding: 16,
      borderRadius: radius.lg,
      marginBottom: 16,
    },
    username: {
      fontSize: 20,
      fontWeight: '800',
      color: t.colors.textHi,
      marginBottom: 4,
    },
    hint: {
      fontSize: 14,
      color: t.colors.textLo,
      textAlign: 'center',
    },
  }));

  if (!data) return null;

  return (
    <View style={styles.container}>
      <View style={styles.qrContainer}>
        {/* QR modules stay dark-on-white for scannability in both themes */}
        <QRCode
          value={value}
          size={220}
          backgroundColor="#FFFFFF"
          color="#000000"
          logo={require('../../assets/icon.png')}
          logoSize={44}
          logoBackgroundColor="#FFFFFF"
        />
      </View>
      <Text style={styles.username}>@{data.username}</Text>
      <Text style={styles.hint}>Scan this code to follow me on Sticket</Text>
    </View>
  );
}
