import QRCode from 'react-native-qrcode-svg';
import { StyleSheet, Text, View } from 'react-native';

import { useQRCode } from '../../hooks/useQRCode';
import { colors, radius } from '../../lib/theme';

export function QRCodeDisplay() {
  const { data, value } = useQRCode();

  if (!data) return null;

  return (
    <View style={styles.container}>
      <View style={styles.qrContainer}>
        <QRCode
          value={value}
          size={220}
          backgroundColor="#FFFFFF"
          color={colors.ink}
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  qrContainer: {
    backgroundColor: colors.textHi,
    padding: 16,
    borderRadius: radius.lg,
    marginBottom: 16,
  },
  username: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textHi,
    marginBottom: 4,
  },
  hint: {
    fontSize: 14,
    color: colors.textLo,
    textAlign: 'center',
  },
});




