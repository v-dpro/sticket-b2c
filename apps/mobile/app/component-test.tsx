import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusPill } from '../components/shared/StatusPill';
import { TierBadge } from '../components/shared/TierBadge';
import { CodeDisplay } from '../components/shared/CodeDisplay';
import { SignupWarning } from '../components/shared/SignupWarning';
import { TimelineCard } from '../components/concert-life/TimelineCard';
import { FeedTabBar } from '../components/feed/FeedTabBar';

export default function ComponentTestScreen() {
  const [feedTab, setFeedTab] = React.useState<'friends' | 'discover'>('friends');

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Component Test</Text>

        <Text style={styles.section}>StatusPill</Text>
        <View style={styles.row}>
          <StatusPill type="ticket" label="Ticket" />
          <StatusPill type="presale" label="Verified Fan" />
          <StatusPill type="upcoming" label="Jan 15" />
          <StatusPill type="tracking" label="Watching" />
        </View>

        <Text style={styles.section}>TierBadge</Text>
        <View style={styles.row}>
          <TierBadge size="small" />
          <TierBadge size="medium" />
        </View>

        <Text style={styles.section}>CodeDisplay</Text>
        <CodeDisplay code="SWIFTIE2025" />

        <Text style={styles.section}>SignupWarning</Text>
        <SignupWarning deadline="Jan 10" />

        <Text style={styles.section}>FeedTabBar</Text>
        <FeedTabBar activeTab={feedTab} onTabChange={setFeedTab} />

        <Text style={styles.section}>TimelineCard - Log</Text>
        <TimelineCard
          type="log"
          artist="Taylor Swift"
          venue="SoFi Stadium"
          city="Los Angeles"
          date="Dec 15, 2024"
          rating={5}
          note="Cried during All Too Well. Worth it."
        />

        <Text style={styles.section}>TimelineCard - Ticket</Text>
        <TimelineCard
          type="ticket"
          artist="The Weeknd"
          venue="Madison Square Garden"
          city="New York"
          date="Jan 20, 2025"
          section="102"
          row="A"
          seat="12"
          isToday
        />

        <Text style={styles.section}>TimelineCard - Tracking</Text>
        <TimelineCard type="tracking" artist="Billie Eilish" venue="Barclays Center" city="Brooklyn" date="Feb 14, 2025" maxPrice="250" />

        <Text style={styles.section}>TimelineCard - Presale</Text>
        <TimelineCard
          type="presale"
          artist="Beyoncé"
          venue="MetLife Stadium"
          city="East Rutherford"
          date="Jan 15, 2025"
          presaleType="Verified Fan"
          presaleCode="BEYHIVE25"
          presaleDeadline="Jan 10"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0B1E',
  },
  content: {
    padding: 24,
    gap: 16,
    paddingBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  section: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D4FF',
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});


