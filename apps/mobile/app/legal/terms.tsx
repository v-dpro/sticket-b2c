import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const goBack = useSafeBack();

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By using Sticket, you agree to these Terms of Service. If you do not agree, please do not use the app.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          Sticket is a platform for tracking and sharing your concert experiences, managing tickets, and discovering live music
          events.
        </Text>

        <Text style={styles.sectionTitle}>3. User Accounts</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the security of your account. You must provide accurate information and keep it
          updated.
        </Text>

        <Text style={styles.sectionTitle}>4. User Content</Text>
        <Text style={styles.paragraph}>
          You retain ownership of content you post. By posting, you grant Sticket a license to use, display, and distribute your
          content within the service.
        </Text>
        <Text style={styles.paragraph}>You agree not to post content that is:</Text>
        <Text style={styles.bullet}>• Illegal or promotes illegal activities</Text>
        <Text style={styles.bullet}>• Harmful, threatening, or harassing</Text>
        <Text style={styles.bullet}>• Sexually explicit or pornographic</Text>
        <Text style={styles.bullet}>• Infringing on others&apos; intellectual property</Text>
        <Text style={styles.bullet}>• Spam or commercial solicitation</Text>

        <Text style={styles.sectionTitle}>5. Prohibited Activities</Text>
        <Text style={styles.paragraph}>You agree not to:</Text>
        <Text style={styles.bullet}>• Impersonate others or create fake accounts</Text>
        <Text style={styles.bullet}>• Use automated systems to access the service</Text>
        <Text style={styles.bullet}>• Attempt to gain unauthorized access</Text>
        <Text style={styles.bullet}>• Interfere with the service&apos;s operation</Text>

        <Text style={styles.sectionTitle}>6. Ticket Services</Text>
        <Text style={styles.paragraph}>
          Sticket may offer ticket management and resale features. We are not responsible for the validity of tickets from third
          parties. Ticket resale is subject to local laws and venue policies.
        </Text>

        <Text style={styles.sectionTitle}>7. Intellectual Property</Text>
        <Text style={styles.paragraph}>
          The Sticket name, logo, and app design are owned by Sticket. You may not use our trademarks without permission.
        </Text>

        <Text style={styles.sectionTitle}>8. Termination</Text>
        <Text style={styles.paragraph}>
          We may suspend or terminate your account for violations of these terms or for any reason at our discretion.
        </Text>

        <Text style={styles.sectionTitle}>9. Disclaimers</Text>
        <Text style={styles.paragraph}>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE AVAILABILITY OR ACCURACY OF
          INFORMATION.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, STICKET SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
          DAMAGES.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may modify these terms at any time. Continued use after changes constitutes acceptance of the new terms.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact</Text>
        <Text style={styles.paragraph}>For questions about these terms:</Text>
        <Text style={styles.contact}>legal@sticket.in</Text>

        <View style={{ height: 40 }} />
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: spacing.xl,
  },
  lastUpdated: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textTertiary,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bullet: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 22,
    marginLeft: 8,
    marginBottom: 4,
  },
  contact: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandPurple,
    marginTop: 8,
  },
});



