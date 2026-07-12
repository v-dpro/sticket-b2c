import { ActivityIndicator, RefreshControl, SectionList, Text, View } from 'react-native';

import type { Notification, NotificationGroup } from '../../types/notification';
import { useTheme, useThemedStyles } from '../../lib/theme-context';
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
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    sectionHeader: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: t.colors.ink,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: t.colors.textLo,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    listContent: {
      paddingBottom: 100,
    },
    footer: {
      paddingVertical: 20,
    },
  }));

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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tokens.colors.mute} colors={[tokens.colors.mute]} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator size="small" color={tokens.colors.mute} />
          </View>
        ) : null
      }
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.listContent}
    />
  );
}



