// ExploreStream — the C14 stanza, assembled. The approved rhythm repeats
// RAIL (utility) → FULL-WIDTH entity spotlight → MOSAIC (crowd posts):
//
//   PresaleRail → TrendingEventCard (biggest) → CrowdMosaic →
//   TourSpotlightCard → RisingArtistsRail → CrowdMosaic →
//   VenueSpotlightCard → medium trending events.
//
// Crowd posts are the connective tissue between entity cards; never two
// rails or two mosaics adjacent (empty sections drop out and adjacent
// mosaics merge, so sparse data can't break the rule). Sections tear in
// staggered, delay capped at ~10 steps.

import React, { useMemo, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { ExploreData } from '../../lib/api/explore';
import { durations, tearIn } from '../../lib/motion';
import { useThemedStyles } from '../../lib/theme-context';
import { Skeleton } from '../ui/Skeleton';
import { CrowdMosaic } from './CrowdMosaic';
import { EventMediumCard } from './EventMediumCard';
import { PresaleRail } from './PresaleRail';
import { RisingArtistsRail } from './RisingArtistsRail';
import { TourSpotlightCard } from './TourSpotlightCard';
import { TrendingEventCard } from './TrendingEventCard';
import { VenueSpotlightCard } from './VenueSpotlightCard';

type SectionKind = 'rail' | 'full' | 'mosaic' | 'list';

type Section = {
  key: string;
  kind: SectionKind;
  node: ReactNode;
};

type ExploreStreamProps = {
  data: ExploreData;
};

export function ExploreStream({ data }: ExploreStreamProps) {
  const styles = useThemedStyles((t) => ({
    section: { marginBottom: 26 },
    listHead: { paddingHorizontal: t.density.pad, marginBottom: 10 },
    listTitle: {
      fontFamily: t.fontFamilies.monoSemi,
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: t.colors.muteSoft,
    },
  }));

  const sections = useMemo<Section[]>(() => {
    const { presales, trendingEvents, risingArtists, spotlightTours, venues, crowdPosts } = data;

    // Crowd-post split — two mosaics of 4–6 tiles when supply allows. When
    // both entities between them (tour + rising rail) are empty, the two
    // would sit adjacent — collapse to a single mosaic at the source.
    const twoMosaics =
      (spotlightTours.length > 0 || risingArtists.length > 0) && crowdPosts.length >= 6;
    const firstMosaic = twoMosaics ? crowdPosts.slice(0, 4) : crowdPosts.slice(0, 6);
    const secondMosaic = twoMosaics ? crowdPosts.slice(4, 10) : [];

    const heroEvent = trendingEvents[0];
    const moreEvents = trendingEvents.slice(1, 7);

    const built: Section[] = [];

    if (presales.length > 0)
      built.push({ key: 'presales', kind: 'rail', node: <PresaleRail presales={presales} /> });
    if (heroEvent)
      built.push({ key: 'hero-event', kind: 'full', node: <TrendingEventCard event={heroEvent} /> });
    if (firstMosaic.length > 0)
      built.push({
        key: 'mosaic-1',
        kind: 'mosaic',
        node: <CrowdMosaic posts={firstMosaic} title="From the crowd" />,
      });
    if (spotlightTours[0])
      built.push({ key: 'tour', kind: 'full', node: <TourSpotlightCard tour={spotlightTours[0]} /> });
    if (risingArtists.length > 0)
      built.push({ key: 'rising', kind: 'rail', node: <RisingArtistsRail artists={risingArtists} /> });
    if (secondMosaic.length > 0)
      built.push({ key: 'mosaic-2', kind: 'mosaic', node: <CrowdMosaic posts={secondMosaic} /> });
    if (venues[0])
      built.push({ key: 'venue', kind: 'full', node: <VenueSpotlightCard venue={venues[0]} /> });
    if (moreEvents.length > 0)
      built.push({
        key: 'more-events',
        kind: 'list',
        node: (
          <View>
            <View style={styles.listHead}>
              <Text style={styles.listTitle}>More trending</Text>
            </View>
            {moreEvents.map((event) => (
              <EventMediumCard key={event.id} event={event} />
            ))}
          </View>
        ),
      });

    // Rhythm fix-up: with sparse data two same-kind sections (two rails)
    // can end up adjacent — pull the next different-kind section between
    // them rather than dropping real content. Unfixable only when nothing
    // else remains, in which case the twin renders anyway.
    for (let i = 1; i < built.length; i++) {
      if (built[i].kind !== built[i - 1].kind) continue;
      const j = built.findIndex((s, idx) => idx > i && s.kind !== built[i].kind);
      if (j > i) {
        const [moved] = built.splice(j, 1);
        built.splice(i, 0, moved);
      }
    }

    return built;
  }, [data, styles]);

  return (
    <View>
      {sections.map((section, i) => (
        <Animated.View
          key={section.key}
          entering={tearIn(Math.min(i, 10) * durations.stagger)}
          style={styles.section}
        >
          {section.node}
        </Animated.View>
      ))}
    </View>
  );
}

// ─── StanzaSkeleton — shimmer geometry of the stanza while loading ──
// Rail of chips → full-width card → 2-col mosaic. Same bones, no data.

export function ExploreStreamSkeleton() {
  const styles = useThemedStyles((t) => ({
    wrap: { gap: 26 },
    rail: { flexDirection: 'row', gap: 8, paddingHorizontal: t.density.pad },
    padded: { paddingHorizontal: t.density.pad },
    mosaic: {
      paddingHorizontal: t.density.pad,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 8,
    },
    tile: { width: '48.75%' },
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.rail}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={176} height={76} borderRadius={16} />
        ))}
      </View>
      <View style={styles.padded}>
        <Skeleton width="100%" height={300} borderRadius={16} />
      </View>
      <View style={styles.mosaic}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.tile}>
            <Skeleton width="100%" height={200} borderRadius={14} />
          </View>
        ))}
      </View>
    </View>
  );
}
