// Tab shell — the new Sticket IA.
//
//   Home · Explore · [LOG] · Upcoming · You
//
// Monochrome by mandate: active = ink (tokens.fg), inactive = mute.
// No per-tab accent colors, no gradient or pink fills. The center LOG
// action is an ink-inversion circle (inverseBg/inverseFg) that springs
// on press and opens the log flow.

import React from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SpringPressable } from '../../components/ui/SpringPressable';
import { useSession } from '../../hooks/useSession';
import { useTheme } from '../../lib/theme-context';

const FAB_SIZE = 58;

function LogButton() {
  const router = useRouter();
  const { tokens } = useTheme();
  const c = tokens.colors;

  return (
    <View style={styles.fabSlot} pointerEvents="box-none">
      <SpringPressable
        haptic="medium"
        onPress={() => router.push('/log/search')}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Log a show"
        style={[
          styles.fab,
          tokens.shadows.elevated,
          { backgroundColor: c.inverseBg, borderColor: c.bg },
        ]}
      >
        <Ionicons name="add" size={30} color={c.inverseFg} />
      </SpringPressable>
    </View>
  );
}

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
          title: 'Home',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
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

      {/* Center LOG action — never a routed screen, just the button. */}
      <Tabs.Screen
        name="log-fab"
        options={{
          title: '',
          tabBarButton: () => <LogButton />,
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

      {/* You — the timeline tab (owned by the concurrent timeline wave). */}
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
  fabSlot: {
    top: -14,
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
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
