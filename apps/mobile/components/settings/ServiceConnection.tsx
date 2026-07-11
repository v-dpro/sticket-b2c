import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { apiClient } from '../../lib/api/client';
import { disconnectService } from '../../lib/api/settings';
import { useTheme, useThemedStyles } from '../../lib/theme-context';

type ServiceConnectionProps = {
  service: 'spotify' | 'apple_music';
  name: string;
  icon: string;
  iconColor: string;
  connected: boolean;
  username?: string;
  onRefresh: () => void;
  isLast?: boolean;
};

export function ServiceConnection({
  service,
  name,
  icon,
  iconColor,
  connected,
  username,
  onRefresh,
  isLast = false,
}: ServiceConnectionProps) {
  const [loading, setLoading] = useState(false);
  const { tokens } = useTheme();
  const styles = useThemedStyles((t) => ({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: t.density.cardPad,
    },
    border: {
      borderBottomWidth: 1,
      borderBottomColor: t.colors.hairline,
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: t.radius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: 15,
      fontWeight: '700',
      color: t.colors.fg,
    },
    username: {
      fontSize: 13,
      color: t.colors.success,
      marginTop: 2,
      fontWeight: '600',
    },
    notConnected: {
      fontSize: 13,
      color: t.colors.mute,
      marginTop: 2,
      fontWeight: '600',
    },
    statusBadge: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: t.radius.full,
      backgroundColor: t.colors.inverseBg,
    },
    statusConnected: {
      backgroundColor: t.colors.card2,
    },
    statusText: {
      fontSize: 13,
      fontWeight: '600',
      color: t.colors.inverseFg,
    },
    statusTextConnected: {
      color: t.colors.success,
    },
  }));

  const connectSpotify = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/auth/spotify/url');
      const url = data?.url as string | undefined;
      if (!url) throw new Error('Missing Spotify URL');

      const redirectUrl = Linking.createURL('spotify-callback');
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);

      if (result.type !== 'success' || !result.url) {
        return;
      }

      const code = result.url.match(/code=([^&]*)/)?.[1];
      if (!code) throw new Error('Missing code in callback');

      await apiClient.post('/auth/spotify/callback', { code });
      onRefresh();
      Alert.alert('Spotify connected', 'Your Spotify account is now connected.');
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error(e);
      const status = e?.response?.status as number | undefined;
      if (status === 404) {
        Alert.alert('Spotify not available', 'Spotify connect is not available on this server yet.');
      } else {
        Alert.alert('Could not connect', e?.response?.data?.error || e?.message || `Failed to connect ${name}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async () => {
    if (connected) {
      Alert.alert(`Disconnect ${name}`, `Are you sure you want to disconnect your ${name} account?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await disconnectService(service);
              onRefresh();
            } catch (err) {
              Alert.alert('Error', `Failed to disconnect ${name}`);
            } finally {
              setLoading(false);
            }
          },
        },
      ]);
      return;
    }

    if (service === 'spotify') {
      await connectSpotify();
      return;
    }

    Alert.alert('Coming soon', `${name} connection isn’t available yet.`);
  };

  return (
    <Pressable style={[styles.container, !isLast && styles.border]} onPress={() => void handlePress()} disabled={loading}>
      <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name}>{name}</Text>
        {connected && username ? <Text style={styles.username}>Connected as {username}</Text> : <Text style={styles.notConnected}>Not connected</Text>}
      </View>

      {loading ? (
        <ActivityIndicator size="small" color={tokens.colors.mute} />
      ) : (
        <View style={[styles.statusBadge, connected && styles.statusConnected]}>
          <Text style={[styles.statusText, connected && styles.statusTextConnected]}>{connected ? 'Connected' : 'Connect'}</Text>
        </View>
      )}
    </Pressable>
  );
}



