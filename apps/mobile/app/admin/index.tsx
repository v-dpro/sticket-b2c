import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { radius, spacing } from '../../lib/theme';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
import { useSession } from '../../hooks/useSession';
import { isAdminUser } from '../../lib/admin/isAdmin';
import { useSafeBack } from '../../lib/navigation/safeNavigation';
import { haptics } from '../../lib/motion';

function StatCard({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles((t) => ({
    statCard: {
      width: '48%',
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    statValue: {
      fontSize: 24,
      fontWeight: '900',
      color: t.colors.brandPurple,
    },
    statLabel: {
      fontSize: 12,
      fontWeight: '800',
      color: t.colors.textLo,
      marginTop: 4,
    },
  }));
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const goBack = useSafeBack();
  const { user } = useSession();
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: spacing.lg,
      paddingBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '900',
      color: t.colors.textHi,
    },
    denied: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
      gap: spacing.sm,
    },
    deniedTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: t.colors.textHi,
    },
    deniedSubtitle: {
      fontSize: 13,
      fontWeight: '700',
      color: t.colors.textLo,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: spacing.xl,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: t.colors.textHi,
      marginBottom: spacing.md,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: t.colors.surface,
      borderRadius: radius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: t.colors.hairline,
    },
    rowIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: t.colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    rowInfo: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: t.colors.textHi,
    },
    rowSubtitle: {
      fontSize: 12,
      fontWeight: '800',
      color: t.colors.textLo,
      marginTop: 2,
    },
  }));

  if (!isAdminUser(user)) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={tokens.colors.textHi} />
          </Pressable>
          <Text style={styles.title}>Admin</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.denied}>
          <Ionicons name="lock-closed" size={32} color={tokens.colors.textLo} />
          <Text style={styles.deniedTitle}>Not authorized</Text>
          <Text style={styles.deniedSubtitle}>This area is restricted.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={tokens.colors.textHi} />
        </Pressable>
        <Text style={styles.title}>Admin</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value="—" />
          <StatCard label="Total Logs" value="—" />
          <StatCard label="Today’s Signups" value="—" />
          <StatCard label="Reports" value="—" />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <Pressable style={styles.row} onPress={() => { haptics.light(); router.push('/admin/reports'); }} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="flag" size={18} color={tokens.colors.error} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Reports</Text>
            <Text style={styles.rowSubtitle}>Review user reports</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => { haptics.light(); router.push('/admin/photos'); }} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="images" size={18} color={tokens.colors.warning} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Photo Moderation</Text>
            <Text style={styles.rowSubtitle}>Approve / reject photos</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => { haptics.light(); router.push('/admin/users'); }} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="people" size={18} color={tokens.colors.brandPurple} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>User Management</Text>
            <Text style={styles.rowSubtitle}>Search and manage users</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => { haptics.light(); router.push('/admin/feedback'); }} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="chatbubbles" size={18} color={tokens.colors.success} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Feedback</Text>
            <Text style={styles.rowSubtitle}>Review beta feedback</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.textLo} />
        </Pressable>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}



