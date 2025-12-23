import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';

import type { Notification, NotificationGroup } from '../../types/notification';
import { colors } from '../../lib/theme';
import { NotificationCard } from './NotificationCard';

type NotificationSection = NotificationGroup & { data: Notification[] };

export function NotificationList({
  groups,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  onPressNotification,
}: {
  groups: NotificationGroup[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  loadingMore: boolean;
  onPressNotification: (notification: Notification) => void;
}) {
  const sections: NotificationSection[] = groups.map((g) => ({ ...g, data: g.notifications }));

  return (
    <SectionList<Notification, NotificationSection>
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationCard notification={item} onPress={() => onPressNotification(item)} />}
      renderSectionHeader={({ section }: { section: NotificationSection }) => (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.date}</Text>
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPurple} colors={[colors.brandPurple]} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={colors.brandPurple} />
          </View>
        ) : null
      }
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 100,
  },
  footer: {
    paddingVertical: 20,
  },
});



