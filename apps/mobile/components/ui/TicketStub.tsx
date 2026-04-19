import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, shadows } from '../../lib/theme';

type TicketStubProps = {
  artist: string;
  venue: string;
  city: string;
  date: string;
  section?: string;
  row?: string;
  seat?: string;
};

function accentHue(artist: string): number {
  const code = artist.length > 0 ? artist.charCodeAt(0) : 65;
  return (code * 11) % 360;
}

export function TicketStub({
  artist,
  venue,
  city,
  date,
  section,
  row,
  seat,
}: TicketStubProps) {
  const hue = accentHue(artist);
  const hasSeatInfo = section || row || seat;

  return (
    <View style={[styles.card, shadows.stub]}>
      {/* Accent band */}
      <View
        style={[
          styles.accentBand,
          { backgroundColor: `hsl(${hue}, 75%, 55%)` },
        ]}
      />

      {/* Top section */}
      <View style={styles.topSection}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.artist}>{artist}</Text>
        <Text style={styles.venue}>
          {venue} {city ? `\u00B7 ${city}` : ''}
        </Text>
      </View>

      {/* Perforation */}
      {hasSeatInfo && (
        <>
          <View style={styles.perforation} />

          {/* Bottom section */}
          <View style={styles.bottomSection}>
            {section != null && (
              <View style={styles.seatBlock}>
                <Text style={styles.seatLabel}>SECTION</Text>
                <Text style={styles.seatValue}>{section}</Text>
              </View>
            )}
            {row != null && (
              <View style={styles.seatBlock}>
                <Text style={styles.seatLabel}>ROW</Text>
                <Text style={styles.seatValue}>{row}</Text>
              </View>
            )}
            {seat != null && (
              <View style={styles.seatBlock}>
                <Text style={styles.seatLabel}>SEAT</Text>
                <Text style={styles.seatValue}>{seat}</Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    overflow: 'hidden',
  },
  accentBand: {
    height: 6,
    width: '100%',
  },
  topSection: {
    padding: 20,
    paddingTop: 16,
  },
  date: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#8A8472',
    marginBottom: 6,
  },
  artist: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  venue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4A4A3E',
  },
  perforation: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4CFC2',
    marginHorizontal: 12,
  },
  bottomSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 24,
  },
  seatBlock: {
    alignItems: 'flex-start',
  },
  seatLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1.5,
    color: '#8A8472',
    marginBottom: 2,
  },
  seatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
});
