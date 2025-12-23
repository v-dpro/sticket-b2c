import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { colors, radius, spacing } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { isAdminUser } from '../../lib/admin/isAdmin';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useSession();

  if (!isAdminUser(user)) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.title}>Admin</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.denied}>
          <Ionicons name="lock-closed" size={32} color={colors.textTertiary} />
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
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
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

        <Pressable style={styles.row} onPress={() => router.push('/admin/reports')} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="flag" size={18} color={colors.error} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Reports</Text>
            <Text style={styles.rowSubtitle}>Review user reports</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/admin/photos')} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="images" size={18} color={colors.warning} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Photo Moderation</Text>
            <Text style={styles.rowSubtitle}>Approve / reject photos</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/admin/users')} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="people" size={18} color={colors.brandPurple} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>User Management</Text>
            <Text style={styles.rowSubtitle}>Search and manage users</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        <Pressable style={styles.row} onPress={() => router.push('/admin/feedback')} accessibilityRole="button">
          <View style={styles.rowIconWrap}>
            <Ionicons name="chatbubbles" size={18} color={colors.success} />
          </View>
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle}>Feedback</Text>
            <Text style={styles.rowSubtitle}>Review beta feedback</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        </Pressable>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
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
    color: colors.textPrimary,
  },
  deniedSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
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
  statCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.brandPurple,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textTertiary,
    marginTop: 2,
  },
});



