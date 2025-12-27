import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, Stack } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '../../components/ui/Screen';
import { colors, spacing } from '../../lib/theme';
import { useSafeBack } from '../../lib/navigation/safeNavigation';

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const goBack = useSafeBack();

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backButton} accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

        <Text style={styles.sectionTitle}>1. Information We Collect</Text>
        <Text style={styles.paragraph}>When you use Sticket, we collect information you provide directly:</Text>
        <Text style={styles.bullet}>• Account information (email, username, profile photo)</Text>
        <Text style={styles.bullet}>• Concert logs and photos you upload</Text>
        <Text style={styles.bullet}>• Comments and interactions with other users</Text>
        <Text style={styles.bullet}>• Ticket information you add to your wallet</Text>

        <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
        <Text style={styles.paragraph}>We use your information to:</Text>
        <Text style={styles.bullet}>• Provide and improve our services</Text>
        <Text style={styles.bullet}>• Personalize your concert recommendations</Text>
        <Text style={styles.bullet}>• Connect you with friends and other users</Text>
        <Text style={styles.bullet}>• Send notifications about shows and updates</Text>

        <Text style={styles.sectionTitle}>3. Information Sharing</Text>
        <Text style={styles.paragraph}>We do not sell your personal information. We may share information:</Text>
        <Text style={styles.bullet}>• With your consent</Text>
        <Text style={styles.bullet}>• To comply with legal obligations</Text>
        <Text style={styles.bullet}>• With service providers who assist our operations</Text>

        <Text style={styles.sectionTitle}>4. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your data. However, no method of transmission over the
          internet is 100% secure.
        </Text>

        <Text style={styles.sectionTitle}>5. Your Rights</Text>
        <Text style={styles.paragraph}>You have the right to:</Text>
        <Text style={styles.bullet}>• Access your personal data</Text>
        <Text style={styles.bullet}>• Correct inaccurate data</Text>
        <Text style={styles.bullet}>• Delete your account and data</Text>
        <Text style={styles.bullet}>• Export your data</Text>

        <Text style={styles.sectionTitle}>6. Third-Party Services</Text>
        <Text style={styles.paragraph}>
          We integrate with Spotify and other services. Their use of your data is governed by their respective privacy policies.
        </Text>

        <Text style={styles.sectionTitle}>7. Children&apos;s Privacy</Text>
        <Text style={styles.paragraph}>
          Sticket is not intended for users under 13 years of age. We do not knowingly collect information from children under 13.
        </Text>

        <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this policy from time to time. We will notify you of any material changes through the app or via email.
        </Text>

        <Text style={styles.sectionTitle}>9. Contact Us</Text>
        <Text style={styles.paragraph}>If you have questions about this privacy policy, please contact us at:</Text>
        <Text style={styles.contact}>privacy@sticket.in</Text>

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



