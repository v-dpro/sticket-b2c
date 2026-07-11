// Tab shell — the Sticket IA, frequency-first.
//
//   Feed · Explore · Upcoming · You
//
// Monochrome by mandate: active = ink (tokens.fg), inactive = mute.
// No FAB: logging is an episodic (per-show) action, so it lives in
// context — the You timeline header, event pages, empty states, and
// show-day prompts — not in permanent chrome.

import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSession } from '../../hooks/useSession';
import { useTheme } from '../../lib/theme-context';

export default function TabsLayout() {
  const { user, profile, isLoading } = useSession();
  const { tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const c = tokens.colors;

  if (!isLoading && !user) {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        // Tab → tab: crossfade, no slide (motion contract).
        animation: 'fade',
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: c.fg,
        tabBarInactiveTintColor: c.mute,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'albums' : 'albums-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="upcoming"
        options={{
          title: 'Upcoming',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="you"
        options={{
          title: 'You',
          tabBarIcon: ({ focused, color }) => {
            const avatarUrl = profile?.avatarUrl;
            if (avatarUrl) {
              return (
                <View
                  style={[
                    styles.avatar,
                    { borderColor: focused ? c.fg : 'transparent' },
                  ]}
                >
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                </View>
              );
            }
            return (
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={26}
                color={color}
              />
            );
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
});
