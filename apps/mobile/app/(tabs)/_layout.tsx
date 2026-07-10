import React from 'react';
import { Redirect, Tabs, useRouter } from 'expo-router';
import {
  ActionSheetIOS,
  Alert,
  Image as RNImage,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { FeedbackButton } from '../../components/feedback/FeedbackButton';
import { colors } from '../../lib/theme';
import { useSession } from '../../hooks/useSession';
import { useHasShowToday } from '../../hooks/useHasShowToday';

// Per-tab accent leads (DESIGN_TOKENS.md). Referenced defensively so this file
// stays decoupled from concurrent theme edits — falls back to spec hex values.
const ACCENTS = {
  cyan: (colors as { cyan?: string }).cyan ?? colors.brandCyan ?? '#00D4FF',
  purple: (colors as { purple?: string }).purple ?? colors.brandPurple ?? '#8B5CF6',
  pink: (colors as { pink?: string }).pink ?? '#EC4899',
  amber: (colors as { amber?: string }).amber ?? colors.warning ?? '#F59E0B',
};
const TAB_INACTIVE = (colors as { mute?: string }).mute ?? colors.textLo;

// Spring per INTERACTIONS.md: tap release stiffness 260, damping 20.
const TAP_SPRING = { stiffness: 260, damping: 20, mass: 0.6 };

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function CenterLogButton() {
  const router = useRouter();
  const { hasShowToday, todayTicket } = useHasShowToday();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const openLogFlow = () => router.push('/log/search');
  const openShowMode = () => {
    if (!todayTicket) return;
    router.push({
      pathname: '/show-mode',
      params: { ticketId: todayTicket.id, eventId: todayTicket.eventId },
    });
  };

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Spec: the FAB opens the Log flow. When a show is happening today we also
    // surface the Show Mode shortcut via a lightweight native chooser.
    if (hasShowToday && todayTicket) {
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title: 'Tonight',
            options: ['Log a show', 'Show Mode', 'Cancel'],
            cancelButtonIndex: 2,
            userInterfaceStyle: 'dark',
          },
          (index) => {
            if (index === 0) openLogFlow();
            else if (index === 1) openShowMode();
          },
        );
      } else {
        Alert.alert('Tonight', undefined, [
          { text: 'Log a show', onPress: openLogFlow },
          { text: 'Show Mode', onPress: openShowMode },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
      return;
    }

    openLogFlow();
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.97, TAP_SPRING);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, TAP_SPRING);
  };

  return (
    <View style={styles.centerButtonContainer} pointerEvents="box-none">
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={hasShowToday ? 'Log a show or open Show Mode' : 'Log a show'}
        style={animatedStyle}
      >
        <View style={styles.centerButton}>
          <Ionicons name="add" size={30} color="#FFFFFF" />
          {hasShowToday ? <View style={styles.showTodayIndicator} /> : null}
        </View>
      </AnimatedPressable>
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
          // Tab → tab: crossfade, no slide (INTERACTIONS.md).
          animation: 'fade',
          tabBarStyle: {
            backgroundColor: 'rgba(8, 8, 16, 0.88)',
            borderTopColor: colors.hairline,
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingBottom: insets.bottom,
          },
          tabBarInactiveTintColor: TAB_INACTIVE,
          tabBarShowLabel: false,
          tabBarItemStyle: { paddingVertical: 4 },
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
        }}
      >
        {/* Tab 1: Home (Feed) — cyan */}
        <Tabs.Screen
          name="feed/index"
          options={{
            title: 'Home',
            tabBarActiveTintColor: ACCENTS.cyan,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={26}
                color={focused ? ACCENTS.cyan : TAB_INACTIVE}
              />
            ),
          }}
        />

        {/* Tab 2: Upcoming (Calendar) — purple */}
        <Tabs.Screen
          name="timeline/index"
          options={{
            title: 'Upcoming',
            tabBarActiveTintColor: ACCENTS.purple,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={26}
                color={focused ? ACCENTS.purple : TAB_INACTIVE}
              />
            ),
          }}
        />

        {/* Tab 3: Center Log FAB — pink, raised */}
        <Tabs.Screen
          name="log-placeholder"
          options={{
            title: '',
            tabBarButton: () => <CenterLogButton />,
          }}
        />

        {/* Tab 4: Wallet — amber, ticket */}
        <Tabs.Screen
          name="wallet"
          options={{
            title: 'Wallet',
            tabBarActiveTintColor: ACCENTS.amber,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? 'ticket' : 'ticket-outline'}
                size={26}
                color={focused ? ACCENTS.amber : TAB_INACTIVE}
              />
            ),
          }}
        />

        {/* Tab 5: Profile — pink avatar ring when active */}
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'You',
            tabBarActiveTintColor: ACCENTS.pink,
            tabBarIcon: ({ focused }) => {
              const avatarUrl = profile?.avatarUrl;
              if (avatarUrl) {
                return (
                  <View style={[styles.profileTabAvatar, focused && styles.profileTabAvatarActive]}>
                    <RNImage source={{ uri: avatarUrl }} style={styles.profileTabImage} />
                  </View>
                );
              }
              return (
                <Ionicons
                  name={focused ? 'person' : 'person-outline'}
                  size={26}
                  color={focused ? ACCENTS.pink : TAB_INACTIVE}
                />
              );
            },
          }}
        />

        {/* Hidden routes — reachable by deep link / in-app navigation, not tabbed */}
        <Tabs.Screen name="discover/index" options={{ href: null }} />
        <Tabs.Screen name="my-artists/index" options={{ href: null }} />
        <Tabs.Screen name="notifications/index" options={{ href: null }} />
        <Tabs.Screen name="search/index" options={{ href: null }} />
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
    backgroundColor: ACCENTS.pink,
    borderWidth: 3,
    borderColor: colors.ink,
    shadowColor: ACCENTS.pink,
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
    borderColor: ACCENTS.pink,
  },
  profileTabImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
});
