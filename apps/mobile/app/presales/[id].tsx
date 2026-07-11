import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

export default function PresaleDetailScreen() {
  const router = useRouter();
  const { tokens } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const styles = useThemedStyles((t) => ({
    screen: { flex: 1, backgroundColor: t.colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.density.pad,
      paddingTop: t.spacing.md,
      paddingBottom: t.spacing.md,
    },
    back: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.card2,
    },
    title: { fontSize: 18, fontWeight: '800', color: t.colors.fg, letterSpacing: -0.3 },
    body: { padding: t.density.pad, gap: t.spacing.sm },
    muted: { color: t.colors.mute, fontSize: 14 },
  }));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <SpringPressable
          onPress={() => {
            // Direct navigation - this should always work
            router.replace('/(tabs)/home' as any);
          }}
          haptic="light"
          style={styles.back}
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={22} color={tokens.colors.fg} />
        </SpringPressable>
        <Text style={styles.title}>Presale</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.muted}>Presale details screen is coming next.</Text>
        <Text style={styles.muted}>ID: {id}</Text>
      </View>
    </SafeAreaView>
  );
}
