import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';

import { useAuthStore } from '../stores/authStore';
import type { ShareCardData } from '../types/share';

import { EventShareCard } from '../components/share/EventShareCard';
import { LogShareCard } from '../components/share/LogShareCard';
import { MilestoneShareCard } from '../components/share/MilestoneShareCard';
import { StatsShareCard } from '../components/share/StatsShareCard';

export function useShareCard() {
  const user = useAuthStore((s) => s.user);

  const username = useMemo(() => user?.username || '', [user?.username]);
  const avatar = useMemo(() => user?.avatarUrl || undefined, [user?.avatarUrl]);

  const renderCard = useCallback(
    (data: ShareCardData) => {
      switch (data.type) {
        case 'log': {
          if (!data.log) return null;
          return React.createElement(LogShareCard, {
            artistName: data.log.artistName,
            artistImage: data.log.artistImage,
            venueName: data.log.venueName,
            venueCity: data.log.venueCity,
            date: data.log.date,
            rating: data.log.rating,
            photo: data.log.photo,
            username,
          });
        }
        case 'stats': {
          if (!data.stats) return null;
          return React.createElement(StatsShareCard, {
            username: data.stats.username,
            avatar: data.stats.avatar,
            showCount: data.stats.showCount,
            artistCount: data.stats.artistCount,
            venueCount: data.stats.venueCount,
            topArtist: data.stats.topArtist,
          });
        }
        case 'milestone': {
          if (!data.milestone) return null;
          return React.createElement(MilestoneShareCard, {
            badgeName: data.milestone.badgeName,
            badgeIcon: data.milestone.badgeIcon,
            badgeColor: data.milestone.badgeColor,
            description: data.milestone.description,
            username: data.milestone.username,
          });
        }
        case 'event': {
          if (!data.event) return null;
          return React.createElement(EventShareCard, {
            artistName: data.event.artistName,
            artistImage: data.event.artistImage,
            venueName: data.event.venueName,
            venueCity: data.event.venueCity,
            date: data.event.date,
            friendsGoing: data.event.friendsGoing,
            username,
          });
        }
        case 'wrapped': {
          return React.createElement(
            View,
            {
              style: {
                width: 350,
                height: 450,
                borderRadius: 24,
                backgroundColor: '#0A0B1E',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              },
            },
            React.createElement(
              Text,
              { style: { color: '#FFFFFF', fontWeight: '800', fontSize: 18, textAlign: 'center' } },
              'Sticket Wrapped'
            ),
            React.createElement(
              Text,
              { style: { color: '#6B6B8D', marginTop: 8, textAlign: 'center' } },
              'Coming soon'
            )
          );
        }
        default:
          return null;
      }
    },
    [username]
  );

  return { username, avatar, renderCard };
}



