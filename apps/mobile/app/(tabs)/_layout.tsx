import React from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { FeedbackButton } from '../../components/feedback/FeedbackButton';
import { colors } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useHasShowToday } from '../../hooks/useHasShowToday';

function CenterDiscoveryButton() {
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
        accessibilityLabel={hasShowToday ? 'Open Show Mode' : 'Discover shows'}
      >
        <LinearGradient
          colors={hasShowToday ? ['#22C55E', '#00D4FF'] : ['#8B5CF6', '#00D4FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.centerButton}
        >
          <Ionicons name={hasShowToday ? 'camera' : 'add'} size={28} color="#FFFFFF" />
          {hasShowToday ? <View style={styles.showTodayIndicator} /> : null}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

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
            backgroundColor: '#1A1A2E',
            borderTopColor: '#2D2D4A',
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
          tabBarActiveTintColor: '#00D4FF',
          tabBarInactiveTintColor: '#6B6B8D',
          tabBarShowLabel: true,
          tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
          tabBarItemStyle: { paddingVertical: 4, minWidth: 60 },
          // Avoid platform default "active background" indicators.
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
        }}
      >
        {/* Tab 1: Feed */}
        <Tabs.Screen
          name="feed/index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconWrapper : undefined}>
                <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} />
              </View>
            ),
          }}
        />

        {/* Tab 2: My Concert Life */}
        <Tabs.Screen
          name="timeline/index"
          options={{
            title: 'My Life',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconWrapper : undefined}>
                <Ionicons name={focused ? 'musical-notes' : 'musical-notes-outline'} size={20} color={color} />
              </View>
            ),
          }}
        />

        {/* Tab 3: Center + Button (Discovery) */}
        <Tabs.Screen
          name="discover/index"
          options={{
            title: '',
            tabBarButton: () => <CenterDiscoveryButton />,
          }}
        />

        {/* Tab 4: My Artists */}
        <Tabs.Screen
          name="my-artists/index"
          options={{
            title: 'Artists',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconWrapper : undefined}>
                <Ionicons name={focused ? 'heart' : 'heart-outline'} size={20} color={color} />
              </View>
            ),
          }}
        />

        {/* Tab 5: Profile */}
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <View style={focused ? styles.activeIconWrapper : undefined}>
                <Ionicons name={focused ? 'person' : 'person-outline'} size={20} color={color} />
              </View>
            ),
          }}
        />

        {/* Hidden tabs (accessible via navigation but not in tab bar) */}
        <Tabs.Screen name="notifications/index" options={{ href: null }} />
        <Tabs.Screen
          name="search/index"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen name="log-placeholder" options={{ href: null }} />
      </Tabs>

      <FeedbackButton />
    </View>
  );
}

const styles = StyleSheet.create({
  activeIconWrapper: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonContainer: {
    position: 'relative',
    top: -20,
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
    borderWidth: 3,
    borderColor: '#0A0B1E',
    shadowColor: '#8B5CF6',
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
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#0A0B1E',
  },
});



