import React from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FeedbackButton } from '../../components/feedback/FeedbackButton';
import { colors } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useHasShowToday } from '../../hooks/useHasShowToday';

function CenterLogButton() {
  const router = useRouter();
  const { hasShowToday, todayTicket } = useHasShowToday();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (hasShowToday && todayTicket) {
      router.push({
        pathname: '/show-mode',
        params: { ticketId: todayTicket.id, eventId: todayTicket.eventId },
      });
    } else {
      router.push('/(tabs)/discover');
    }
  };

  return (
    <View style={styles.centerButtonContainer}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={hasShowToday ? 'Open Show Mode' : 'Log a show'}
      >
        <View style={styles.centerButton}>
          <Ionicons name="add" size={28} color="#FFFFFF" />
          {hasShowToday ? <View style={styles.showTodayIndicator} /> : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

// Per-tab accent colors
const tabAccents = {
  feed: colors.brandCyan,
  upcoming: colors.brandPurple,
  wallet: colors.warning,
  profile: colors.pink,
} as const;

export default function TabsLayout() {
  const { user, isLoading } = useSession();
  const insets = useSafeAreaInsets();

  // Auth gate: if you sign out while inside tabs, kick back to auth.
  if (!isLoading && !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const tabBarHeight = 80 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="feed/index"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.ink,
            borderTopColor: colors.hairline,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
          tabBarActiveTintColor: colors.brandCyan,
          tabBarInactiveTintColor: colors.textLo,
          tabBarShowLabel: true,
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '600',
            letterSpacing: 0.5,
          },
          tabBarItemStyle: { paddingVertical: 4, minWidth: 60 },
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
        }}
      >
        {/* Tab 1: Feed */}
        <Tabs.Screen
          name="feed/index"
          options={{
            title: 'Feed',
            tabBarActiveTintColor: tabAccents.feed,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
                color={focused ? tabAccents.feed : colors.textLo}
              />
            ),
          }}
        />

        {/* Tab 2: Upcoming */}
        <Tabs.Screen
          name="timeline/index"
          options={{
            title: 'Upcoming',
            tabBarActiveTintColor: tabAccents.upcoming,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={20}
                color={focused ? tabAccents.upcoming : colors.textLo}
              />
            ),
          }}
        />

        {/* Tab 3: Center Log FAB */}
        <Tabs.Screen
          name="discover/index"
          options={{
            title: '',
            tabBarButton: () => <CenterLogButton />,
          }}
        />

        {/* Tab 4: Wallet */}
        <Tabs.Screen
          name="log-placeholder"
          options={{
            title: 'Wallet',
            tabBarActiveTintColor: tabAccents.wallet,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'ticket' : 'ticket-outline'}
                size={20}
                color={focused ? tabAccents.wallet : colors.textLo}
              />
            ),
          }}
        />

        {/* Tab 5: Profile */}
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarActiveTintColor: tabAccents.profile,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={20}
                color={focused ? tabAccents.profile : colors.textLo}
              />
            ),
          }}
        />

        {/* Hidden tabs (accessible via navigation but not in tab bar) */}
        <Tabs.Screen name="notifications/index" options={{ href: null }} />
        <Tabs.Screen name="search/index" options={{ href: null }} />
        <Tabs.Screen name="my-artists/index" options={{ href: null }} />
      </Tabs>

      <FeedbackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  centerButtonContainer: {
    position: 'relative',
    top: -16,
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink,
    borderWidth: 3,
    borderColor: colors.ink,
    shadowColor: colors.pink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  showTodayIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.ink,
  },
});
