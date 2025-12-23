import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';

import { EarnedBadgeModal } from '../../components/badges/EarnedBadgeModal';
import { Screen } from '../../components/ui/Screen';
import { colors, gradients, radius, spacing } from '../../lib/theme';
import { getAllBadges } from '../../lib/api/badges';
import { getEventById, type Event } from '../../lib/local/repo/eventsRepo';
import type { Badge } from '../../types/badge';

type ConfettiParticle = {
  id: number;
  x: number; // px
  y: number; // start px
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  round: boolean;
};

const confettiColors = [colors.brandCyan, colors.brandPurple, colors.brandPink];

function makeConfetti(count: number, width: number): ConfettiParticle[] {
  const rand = (min: number, max: number) => min + Math.random() * (max - min);
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand(0, Math.max(1, width)),
    y: -rand(10, 40),
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)]!,
    size: rand(6, 14),
    rotation: rand(0, 360),
    delay: rand(0, 0.5),
    duration: rand(3, 5),
    round: Math.random() > 0.5,
  }));
}

function formatDate(dateISO: string) {
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return dateISO;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function LogSuccess() {
  const router = useRouter();
  const { eventId, newBadges } = useLocalSearchParams<{ eventId: string; newBadges?: string }>();
  const { width, height } = useWindowDimensions();

  const [event, setEvent] = useState<Event | null>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;

  const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);

  const confetti = useMemo(() => makeConfetti(30, width), [width]);

  useEffect(() => {
    if (!eventId) return;
    getEventById(String(eventId)).then(setEvent).catch(() => setEvent(null));
  }, [eventId]);

  useEffect(() => {
    const ids = String(newBadges || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!ids.length) return;

    let cancelled = false;
    (async () => {
      try {
        const all = await getAllBadges();
        if (cancelled) return;
        const found = ids.map((id) => all.find((b) => b.id === id)).filter(Boolean) as Badge[];
        setEarnedBadges(found);
        setBadgeIndex(0);
        setBadgeModalVisible(found.length > 0);
      } catch {
        // If we can't load the catalog, just skip the badge modal.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [newBadges]);

  useEffect(() => {
    progress.setValue(0);
    check.setValue(0);

    Animated.timing(progress, {
      toValue: 1,
      duration: 4500,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();

    Animated.spring(check, {
      toValue: 1,
      damping: 14,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [check, progress]);

  const show = {
    artist: event?.artist.name ?? 'The Weeknd',
    venue: event?.venue.name ?? 'SoFi Stadium',
    date: event?.date ? formatDate(event.date) : 'December 15, 2024',
    artistImage: event?.artist.imageUrl || event?.imageUrl || null,
  };

  return (
    <Screen padded={false}>
      {/* Confetti layer */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden' }}>
        {confetti.map((p) => {
          const y = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [p.y, height + 120],
          });
          const rot = progress.interpolate({
            inputRange: [0, 1],
            outputRange: [`${p.rotation}deg`, `${p.rotation + 360 * 3}deg`],
          });
          const opacity = progress.interpolate({
            inputRange: [0, 0.08, 0.92, 1],
            outputRange: [0, 1, 1, 0],
          });

          return (
            <Animated.View
              key={p.id}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                borderRadius: p.round ? 999 : 2,
                backgroundColor: p.color,
                opacity,
                transform: [{ translateX: p.x }, { translateY: y }, { rotate: rot }],
              }}
            />
          );
        })}
      </View>

      {/* Main content */}
      <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: 128, alignItems: 'center', justifyContent: 'center' }}>
        {/* Glowing ring */}
        <Animated.View
          style={{
            marginBottom: 32,
            transform: [
              {
                scale: check.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
              },
              {
                rotate: check.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }),
              },
            ],
          }}
        >
          <View style={{ position: 'absolute', left: -12, right: -12, top: -12, bottom: -12, borderRadius: 999, opacity: 0.55 }}>
            <LinearGradient colors={gradients.rainbow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, borderRadius: 999 }} />
          </View>

          <LinearGradient
            colors={gradients.rainbow}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 96,
              height: 96,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: colors.brandPurple,
              shadowOpacity: 0.5,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
            }}
          >
            <Ionicons name="checkmark" size={52} color={colors.textPrimary} />
          </LinearGradient>
        </Animated.View>

        {/* Text stack */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 28, fontWeight: '900', marginBottom: 12 }}>You were there!</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '900', marginBottom: 6 }}>{show.artist}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 18, marginBottom: 4 }}>at {show.venue}</Text>
          <Text style={{ color: colors.textTertiary, fontSize: 16 }}>{show.date}</Text>
        </View>

        {/* Artist image ring */}
        {show.artistImage ? (
          <LinearGradient colors={gradients.rainbow} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 104, height: 104, borderRadius: 999, padding: 2 }}>
            <View style={{ width: '100%', height: '100%', borderRadius: 999, backgroundColor: colors.background, padding: 2 }}>
              <View style={{ width: '100%', height: '100%', borderRadius: 999, overflow: 'hidden', backgroundColor: colors.surfaceElevated }}>
                <Image source={{ uri: show.artistImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
            </View>
          </LinearGradient>
        ) : null}
      </View>

      {/* Bottom buttons */}
      <View style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 24, gap: 12 }}>
        <Pressable
          onPress={() => {
            if (eventId) router.replace({ pathname: '/log/details', params: { eventId: String(eventId) } });
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}
        >
          <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height: 56, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>Add Details</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          onPress={() => {
            if (eventId) router.replace({ pathname: '/event/[eventId]', params: { eventId: String(eventId) } });
            else router.replace('/(tabs)/discover');
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}
        >
          <View style={{ height: 56, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '900' }}>Done</Text>
          </View>
        </Pressable>
      </View>

      <EarnedBadgeModal
        badge={earnedBadges[badgeIndex] ?? null}
        visible={badgeModalVisible}
        onClose={() => {
          const next = badgeIndex + 1;
          if (next < earnedBadges.length) setBadgeIndex(next);
          else setBadgeModalVisible(false);
        }}
      />
    </Screen>
  );
}



