import axios from 'axios';
export interface BandsintownEvent {
    id: string;
    artist_id: string;
    url: string;
    datetime: string;
    title?: string;
    description?: string;
    venue: {
        name: string;
        city: string;
        region: string;
        country: string;
        latitude: string;
        longitude: string;
    };
    lineup: string[];
    offers?: {
        type: string;
        url: string;
        status: string;
    }[];
}
export declare function getBandsintownEventsForArtist(artistName: string): Promise<BandsintownEvent[]>;
export { axios as bandsintownHttp };
//# sourceMappingURL=bandsintown.d.ts.map