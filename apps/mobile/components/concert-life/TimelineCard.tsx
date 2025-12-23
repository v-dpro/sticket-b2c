import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { StatusPill } from '../shared/StatusPill';
import { CodeDisplay } from '../shared/CodeDisplay';
import { SignupWarning } from '../shared/SignupWarning';

export type TimelineCardType = 'log' | 'ticket' | 'tracking' | 'presale';

interface TimelineCardProps {
  type: TimelineCardType;
  artist: string;
  venue: string;
  city: string;
  date: string;
  rating?: number | null;
  note?: string | null;
  section?: string | null;
  row?: string | null;
  seat?: string | null;
  maxPrice?: string | number | null;
  presaleType?: string;
  presaleCode?: string | null;
  presaleDeadline?: string | null;
  isToday?: boolean;
  onPress?: () => void;
}

const typeConfig = {
  log: {
    color: '#22C55E',
    badgeLabel: 'Attended',
    badgeType: 'upcoming' as const,
  },
  ticket: {
    color: '#00D4FF',
    badgeLabel: 'Ticket',
    badgeType: 'ticket' as const,
  },
  tracking: {
    color: '#F59E0B',
    badgeLabel: 'Watching',
    badgeType: 'tracking' as const,
  },
  presale: {
    color: '#8B5CF6',
    badgeLabel: 'Presale',
    badgeType: 'presale' as const,
  },
};

export function TimelineCard({
  type,
  artist,
  venue,
  city,
  date,
  rating,
  note,
  section,
  row,
  seat,
  maxPrice,
  presaleType,
  presaleCode,
  presaleDeadline,
  isToday = false,
  onPress,
}: TimelineCardProps) {
  const cfg = typeConfig[type];
  const badgeLabel = type === 'presale' && presaleType ? presaleType : cfg.badgeLabel;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} accessibilityRole="button">
      <View style={styles.content}>
        <View style={[styles.indicator, { backgroundColor: cfg.color }]} />

        <View style={styles.mainContent}>
          <View style={styles.headerRow}>
            <Text style={styles.artist} numberOfLines={1}>
              {artist}
            </Text>
            <StatusPill type={cfg.badgeType} label={badgeLabel} />
          </View>

          <Text style={styles.venue} numberOfLines={1}>
            {venue}, {city}
          </Text>

          <Text style={styles.date}>
            {date}
            {isToday ? <Text style={styles.today}> Today!</Text> : null}
          </Text>

          {type === 'log' && typeof rating === 'number' ? (
            <View style={styles.ratingRow}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Ionicons key={i} name="star" size={16} color={i < Math.round(rating) ? '#FFD700' : '#3D3D5C'} />
              ))}
            </View>
          ) : null}

          {type === 'log' && note ? (
            <Text style={styles.note} numberOfLines={2}>
              “{note}”
            </Text>
          ) : null}

          {type === 'ticket' && section ? (
            <Text style={styles.seatInfo}>
              Sec {section}
              {row ? ` · Row ${row}` : ''}
              {seat ? ` · Seat ${seat}` : ''}
            </Text>
          ) : null}

          {type === 'tracking' && maxPrice != null ? (
            <Text style={styles.maxPrice}>
              Max price: <Text style={styles.maxPriceValue}>${String(maxPrice)}</Text>
            </Text>
          ) : null}

          {type === 'presale' && presaleCode ? (
            <View style={styles.codeWrapper}>
              <CodeDisplay code={presaleCode} />
            </View>
          ) : null}

          {type === 'presale' && presaleDeadline ? (
            <View style={styles.warningWrapper}>
              <SignupWarning deadline={presaleDeadline} />
            </View>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#6B6B8D" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D2D4A',
    padding: 16,
  },
  content: {
    flexDirection: 'row',
    gap: 12,
  },
  indicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  mainContent: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  artist: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  venue: {
    fontSize: 14,
    color: '#A0A0B8',
    marginBottom: 4,
  },
  date: {
    fontSize: 13,
    color: '#A0A0B8',
    marginBottom: 8,
  },
  today: {
    color: '#00D4FF',
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  note: {
    fontSize: 13,
    color: '#A0A0B8',
    fontStyle: 'italic',
  },
  seatInfo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00D4FF',
  },
  maxPrice: {
    fontSize: 13,
    color: '#A0A0B8',
  },
  maxPriceValue: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  codeWrapper: {
    marginTop: 12,
  },
  warningWrapper: {
    marginTop: 8,
  },
});


