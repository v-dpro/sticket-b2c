import { type BandsintownEvent } from './bandsintown';
export declare function upsertBandsintownEvent(artistName: string, event: BandsintownEvent): Promise<({
    artist: {
        name: string;
        id: string;
        bio: string | null;
        spotifyId: string | null;
        createdAt: Date;
        updatedAt: Date;
        bandsintownId: string | null;
        imageUrl: string | null;
        genres: string[];
    };
    venue: {
        name: string;
        id: string;
        city: string;
        createdAt: Date;
        updatedAt: Date;
        imageUrl: string | null;
        state: string | null;
        country: string;
        address: string | null;
        lat: number | null;
        lng: number | null;
        capacity: number | null;
    };
} & {
    name: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    source: string | null;
    artistId: string;
    venueId: string;
    imageUrl: string | null;
    date: Date;
    endDate: Date | null;
    ticketUrl: string | null;
    externalId: string | null;
    setlistfmId: string | null;
}) | null>;
export declare function syncUpcomingEventsForArtistName(artistName: string, limitPerArtist?: number): Promise<any[]>;
export declare function syncUpcomingEventsForArtistNames(artistNames: string[], options?: {
    maxArtists?: number;
    limitPerArtist?: number;
}): Promise<any[]>;
//# sourceMappingURL=events.d.ts.map