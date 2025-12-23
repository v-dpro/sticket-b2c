import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { FeedbackModal } from './FeedbackModal';
import { colors, radius } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { usePathname } from 'expo-router';

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const { user } = useSession();
  const pathname = usePathname();

  const context = useMemo(
    () => ({
      userId: user?.id,
      email: user?.email,
      path: pathname,
    }),
    [user?.email, user?.id, pathname]
  );

  return (
    <>
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <Pressable style={styles.button} onPress={() => setOpen(true)} accessibilityRole="button">
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <FeedbackModal visible={open} onClose={() => setOpen(false)} context={context} />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 18,
    bottom: 96,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brandPurple,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brandPurple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 10,
  },
});



