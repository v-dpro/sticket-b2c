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
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CenterTabButton } from '../../components/nav/CenterTabButton';
import { useSession } from '../../hooks/useSession';
import { haptics } from '../../lib/motion';
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
      // Every tab switch gives the light interactivity tick.
      screenListeners={{ tabPress: () => haptics.light() }}
      screenOptions={{
        headerShown: false,
        // Icon-only bar — labels off, five buttons aligned on one row.
        tabBarShowLabel: false,
        // Tab → tab: instant, like every native iOS tab bar. No crossfade.
        animation: 'none',
        sceneStyle: { backgroundColor: c.bg },
        tabBarStyle: {
          backgroundColor: c.bg,
          overflow: 'visible',
          borderTopColor: c.hairline,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 54 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 6,
          // Thumb reach: squeeze the row inward so the outer tabs don't
          // live in the corners.
          paddingHorizontal: 26,
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
            <Ionicons name={focused ? 'file-tray-full' : 'file-tray-full-outline'} size={27} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'compass' : 'compass-outline'} size={27} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="timeline"
        options={{
          title: 'Timeline',
          // THE CENTER BUTTON — tap opens the Timeline; HOLD pops the
          // "+ Log" pill (tap it or slide up to log).
          tabBarButton: (props) => (
            <CenterTabButton
              onPress={props.onPress as (e?: unknown) => void}
              accessibilityState={props.accessibilityState as { selected?: boolean }}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={27} color={color} />
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
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={80}
                    cachePolicy="memory-disk"
                  />
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
