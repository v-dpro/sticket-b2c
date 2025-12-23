import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format } from 'date-fns';
import type { UserShowSummary } from '../../types/artist';

interface YourHistoryProps {
  showCount: number;
  firstShow?: UserShowSummary;
  lastShow?: UserShowSummary;
  onSeeAllPress: () => void;
}

export function YourHistory({ showCount, firstShow, lastShow, onSeeAllPress }: YourHistoryProps) {
  if (showCount === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.1)', 'rgba(232, 121, 249, 0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyCard}
        >
          <Ionicons name="musical-notes-outline" size={32} color="#8B5CF6" />
          <Text style={styles.emptyTitle}>You haven't seen them yet</Text>
          <Text style={styles.emptySubtitle}>Check out their upcoming shows below!</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable onPress={onSeeAllPress}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.15)', 'rgba(232, 121, 249, 0.15)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.historyCard}
        >
          <View style={styles.countCircle}>
            <Text style={styles.countNumber}>{showCount}</Text>
          </View>

          <View style={styles.historyContent}>
            <Text style={styles.historyTitle}>
              You've seen them {showCount} time{showCount !== 1 ? 's' : ''}
            </Text>

            {firstShow && (
              <View style={styles.showRow}>
                <Text style={styles.showLabel}>First:</Text>
                <Text style={styles.showInfo}>
                  {format(new Date(firstShow.date), 'MMM d, yyyy')} at {firstShow.venueName}
                </Text>
              </View>
            )}

            {lastShow && lastShow.eventId !== firstShow?.eventId && (
              <View style={styles.showRow}>
                <Text style={styles.showLabel}>Last:</Text>
                <Text style={styles.showInfo}>
                  {format(new Date(lastShow.date), 'MMM d, yyyy')} at {lastShow.venueName}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#A0A0B8',
    marginTop: 4,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  countCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  countNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  showRow: {
    flexDirection: 'row',
    marginTop: 2,
  },
  showLabel: {
    fontSize: 12,
    color: '#6B6B8D',
    width: 36,
  },
  showInfo: {
    fontSize: 12,
    color: '#A0A0B8',
    flex: 1,
  },
});



