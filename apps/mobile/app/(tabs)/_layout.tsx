import React from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Image as RNImage } from 'react-native';
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

export default function TabsLayout() {
  const { user, profile, isLoading } = useSession();
  const insets = useSafeAreaInsets();

  if (!isLoading && !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  const tabBarHeight = 52 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        initialRouteName="feed/index"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: 'rgba(8, 8, 16, 0.88)',
            borderTopColor: colors.hairline,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
          tabBarActiveTintColor: colors.textHi,
          tabBarInactiveTintColor: colors.textHi,
          tabBarShowLabel: false,
          tabBarItemStyle: { paddingVertical: 4 },
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
        }}
      >
        {/* Tab 1: Home (Feed) */}
        <Tabs.Screen
          name="feed/index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={26}
                color={colors.textHi}
                style={{ opacity: focused ? 1 : 0.5 }}
              />
            ),
          }}
        />

        {/* Tab 2: Upcoming (Calendar/Plans) */}
        <Tabs.Screen
          name="timeline/index"
          options={{
            title: 'Upcoming',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={26}
                color={colors.textHi}
                style={{ opacity: focused ? 1 : 0.5 }}
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

        {/* Tab 4: Concert Life */}
        <Tabs.Screen
          name="my-artists/index"
          options={{
            title: 'Life',
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'musical-notes' : 'musical-notes-outline'}
                size={26}
                color={colors.textHi}
                style={{ opacity: focused ? 1 : 0.5 }}
              />
            ),
          }}
        />

        {/* Tab 5: Profile (avatar with ring) */}
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'You',
            tabBarIcon: ({ focused }) => {
              const avatarUrl = profile?.avatarUrl;
              if (avatarUrl) {
                return (
                  <View style={[styles.profileTabAvatar, focused && styles.profileTabAvatarActive]}>
                    <RNImage
                      source={{ uri: avatarUrl }}
                      style={styles.profileTabImage}
                    />
                  </View>
                );
              }
              return (
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  size={26}
                  color={colors.textHi}
                  style={{ opacity: focused ? 1 : 0.5 }}
                />
              );
            },
          }}
        />

        {/* Hidden tabs */}
        <Tabs.Screen name="notifications/index" options={{ href: null }} />
        <Tabs.Screen name="search/index" options={{ href: null }} />
        <Tabs.Screen name="log-placeholder" options={{ href: null }} />
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
  profileTabAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  profileTabAvatarActive: {
    borderColor: colors.textHi,
  },
  profileTabImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
