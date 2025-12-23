import { Ionicons } from '@expo/vector-icons';
import { Pressable, Share, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius } from '../../lib/theme';

type InviteButtonProps = {
  style?: StyleProp<ViewStyle>;
};

export function InviteButton({ style }: InviteButtonProps) {
  const handleInvite = async () => {
    try {
      await Share.share({
        title: 'Join me on Sticket!',
        message: 'Track your concert life with Sticket! Download now: https://sticket.in/download',
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Share failed:', err);
    }
  };

  return (
    <Pressable style={[styles.container, style]} onPress={() => void handleInvite()}>
      <Ionicons name="paper-plane" size={18} color={colors.brandPurple} />
      <Text style={styles.text}>Invite Friends</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: radius.md,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brandPurple,
    borderStyle: 'dashed',
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandPurple,
  },
});




