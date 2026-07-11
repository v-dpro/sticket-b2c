import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme } from '../../lib/theme-context';

// The stub is a physical "paper" ticket metaphor — a cream card that reads
// the same in both themes, so its text is fixed dark ink. Only the punched
// cutout holes track the live screen background behind them.
type TicketStubProps = {
  artist: string;
  venue: string;
  city: string;
  date: string;
  section?: string;
  row?: string;
  seat?: string;
};

export function TicketStub({
  artist,
  venue,
  city,
  date,
  section,
  row,
  seat,
}: TicketStubProps) {
  const { tokens } = useTheme();
  const hasSeatInfo = section || row || seat;
  const cutout = { backgroundColor: tokens.colors.bg };
  const mono = tokens.fontFamilies.mono;
  const monoBold = tokens.fontFamilies.monoBold;

  return (
    <View style={styles.card}>
      {/* Top section */}
      <View style={styles.topSection}>
        <Text style={[styles.date, { fontFamily: mono }]}>{date}</Text>
        <Text style={styles.artist}>{artist}</Text>
        <Text style={[styles.venue, { fontFamily: tokens.fontFamilies.ui }]}>
          {venue} {city ? `· ${city}` : ''}
        </Text>
      </View>

      {/* Perforation with circle cutouts */}
      {hasSeatInfo && (
        <>
          <View style={styles.perforationWrap}>
            {/* Left cutout */}
            <View style={[styles.cutoutLeft, cutout]} />
            {/* Dashed line */}
            <View style={styles.perforation} />
            {/* Right cutout */}
            <View style={[styles.cutoutRight, cutout]} />
          </View>

          {/* Bottom section */}
          <View style={styles.bottomSection}>
            {section != null && (
              <View style={styles.seatBlock}>
                <Text style={[styles.seatLabel, { fontFamily: mono }]}>SECTION</Text>
                <Text style={[styles.seatValue, { fontFamily: monoBold }]}>{section}</Text>
              </View>
            )}
            {row != null && (
              <View style={styles.seatBlock}>
                <Text style={[styles.seatLabel, { fontFamily: mono }]}>ROW</Text>
                <Text style={[styles.seatValue, { fontFamily: monoBold }]}>{row}</Text>
              </View>
            )}
            {seat != null && (
              <View style={styles.seatBlock}>
                <Text style={[styles.seatLabel, { fontFamily: mono }]}>SEAT</Text>
                <Text style={[styles.seatValue, { fontFamily: monoBold }]}>{seat}</Text>
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
    backgroundColor: '#F6F1E4',
    borderRadius: 18,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
    elevation: 12,
  },
  topSection: {
    padding: 20,
    paddingTop: 16,
  },
  date: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#888',
    marginBottom: 6,
  },
  artist: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#0B0B14',
    marginBottom: 4,
  },
  venue: {
    fontSize: 12,
    color: '#555',
  },
  perforationWrap: {
    position: 'relative',
    overflow: 'visible',
    height: 1,
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  perforation: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D4CFC2',
  },
  cutoutLeft: {
    position: 'absolute',
    left: -20,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    zIndex: 1,
  },
  cutoutRight: {
    position: 'absolute',
    right: -20,
    top: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    zIndex: 1,
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
    letterSpacing: 1.5,
    color: '#888',
    marginBottom: 2,
  },
  seatValue: {
    fontSize: 15,
    color: '#0B0B14',
  },
});
