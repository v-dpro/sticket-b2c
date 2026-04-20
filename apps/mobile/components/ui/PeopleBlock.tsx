import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { colors, accentSets, radius, fontFamilies } from '../../lib/theme';
import { PersonRow } from './PersonRow';

// ── Types ──────────────────────────────────────────────────

type PersonData = {
  name: string;
  username: string;
  avatar?: string;
  matchScore?: number;
  relationship: 'friend' | 'fof' | 'stranger';
};

export type PeopleBlockProps = {
  title?: string; // default "YOUR PEOPLE"
  subtitle?: string; // e.g. "INTO THIS ARTIST"
  people: PersonData[];
  variant?: 'headline' | 'section'; // headline = compact ribbon, section = full list
  emptyHint?: string;
  limit?: number; // default 3
  onViewAll?: () => void;
};

// ── Headline variant: compact avatar-stack ribbon ──────────

function HeadlineRibbon({ people, title, subtitle }: {
  people: PersonData[];
  title: string;
  subtitle?: string;
}) {
  const friends = people.filter((p) => p.relationship === 'friend');
  const fof = people.filter((p) => p.relationship === 'fof');
  const displayed = people.slice(0, 5);

  // Build blurb
  const parts: string[] = [];
  if (friends.length > 0) {
    const names = friends.slice(0, 2).map((f) => f.name);
    if (friends.length <= 2) {
      parts.push(names.join(' and '));
    } else {
      parts.push(`${names.join(', ')}... +${friends.length - 2} friends`);
    }
  }
  if (fof.length > 0) {
    parts.push(`${fof.length} FoF`);
  }
  const blurb = parts.join(', plus ');

  return (
    <View style={styles.ribbonCard}>
      {/* Avatar stack */}
      <View style={styles.avatarStack}>
        {displayed.map((person, idx) => (
          <View
            key={person.username}
            style={[
              styles.stackAvatarWrap,
              { marginLeft: idx === 0 ? 0 : -8, zIndex: displayed.length - idx },
            ]}
          >
            {person.avatar ? (
              <Image source={{ uri: person.avatar }} style={styles.stackAvatar} />
            ) : (
              <View style={styles.stackAvatarPlaceholder}>
                <Text style={styles.stackAvatarInitial}>
                  {(person.name?.[0] ?? 'U').toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Blurb */}
      <Text style={styles.ribbonBlurb} numberOfLines={2}>
        {blurb || `${people.length} people`}
      </Text>
    </View>
  );
}

// ── Component ──────────────────────────────────────────────

export function PeopleBlock({
  title = 'YOUR PEOPLE',
  subtitle,
  people,
  variant = 'section',
  emptyHint,
  limit = 3,
  onViewAll,
}: PeopleBlockProps) {
  // Empty state
  if (people.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>{title}</Text>
        {emptyHint ? (
          <Text style={styles.emptyHint}>{emptyHint}</Text>
        ) : (
          <Text style={styles.emptyHint}>No connections here yet.</Text>
        )}
      </View>
    );
  }

  // Headline variant
  if (variant === 'headline') {
    return <HeadlineRibbon people={people} title={title} subtitle={subtitle} />;
  }

  // Section variant
  const visible = people.slice(0, limit);
  const totalCount = people.length;

  return (
    <View style={styles.sectionContainer}>
      {/* Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionLabel}>
          {title} {'\u00B7'} {totalCount}
        </Text>
        <Text style={styles.sectionSubLabel}>RANKED BY TASTE MATCH</Text>
      </View>

      {/* Card */}
      <View style={styles.sectionCard}>
        {visible.map((person, idx) => (
          <PersonRow
            key={person.username}
            name={person.name}
            username={person.username}
            avatar={person.avatar}
            matchScore={person.matchScore}
            relationship={person.relationship}
            showDivider={idx < visible.length - 1}
          />
        ))}
      </View>

      {/* View all */}
      {totalCount > limit && onViewAll && (
        <Pressable style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={styles.viewAllText}>
            VIEW ALL {totalCount} PEOPLE {'\u2192'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Headline variant ──
  ribbonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: accentSets.cyan.soft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackAvatarWrap: {
    width: 26,
    height: 26,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.surface,
    overflow: 'hidden',
  },
  stackAvatar: {
    width: '100%',
    height: '100%',
  },
  stackAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarInitial: {
    color: colors.textLo,
    fontSize: 10,
    fontWeight: '700',
  },
  ribbonBlurb: {
    flex: 1,
    fontSize: 12.5,
    color: colors.textMid,
    lineHeight: 12.5 * 1.4,
  },

  // ── Section variant ──
  sectionContainer: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textLo,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sectionSubLabel: {
    fontFamily: fontFamilies.monoMedium,
    fontSize: 9,
    fontWeight: '500',
    color: colors.textLo,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  viewAllButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  viewAllText: {
    fontFamily: fontFamilies.monoBold,
    fontSize: 10.5,
    fontWeight: '700',
    color: accentSets.cyan.hex,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Empty state ──
  emptyContainer: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fontFamilies.monoSemi,
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textLo,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  emptyHint: {
    fontSize: 13,
    color: colors.textLo,
    lineHeight: 13 * 1.5,
    textAlign: 'center',
  },
});
