import { Ionicons } from '@expo/vector-icons';
import { Pressable, Share, Text, type StyleProp, type ViewStyle } from 'react-native';

import { radius } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

type InviteButtonProps = {
  style?: StyleProp<ViewStyle>;
};

export function InviteButton({ style }: InviteButtonProps) {
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderRadius: radius.md,
      paddingVertical: 14,
      gap: 8,
      borderWidth: 1,
      borderColor: t.colors.line,
      borderStyle: 'dashed',
    },
    text: {
      fontSize: 16,
      fontWeight: '700',
      color: t.colors.fg,
    },
  }));

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
      <Ionicons name="paper-plane" size={18} color={tokens.colors.mute} />
      <Text style={styles.text}>Invite Friends</Text>
    </Pressable>
  );
}
