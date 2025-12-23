import axios from 'axios';
export interface SetlistSong {
    name: string;
    info?: string;
    cover?: {
        name: string;
    };
    tape?: boolean;
}
export interface Setlist {
    id: string;
    eventDate: string;
    artist: {
        name: string;
        mbid?: string;
    };
    venue: {
        name: string;
        city: {
            name: string;
            state?: string;
            country: {
                code: string;
            };
        };
    };
    sets?: {
        set: Array<{
            song?: SetlistSong[];
            encore?: number;
        }>;
    };
    url: string;
}
export declare function searchSetlists(params: Record<string, string | number | undefined>): Promise<Setlist[]>;
export declare function getSetlist(setlistId: string): Promise<Setlist | null>;
export declare function extractSongs(setlist: Setlist): Array<{
    name: string;
    info?: string;
    isEncore: boolean;
}>;
export declare function findSetlistForShow(artistName: string, venueName: string, date: Date): Promise<Setlist | null>;
export declare function getSetlistForEvent(artistName: string, venueName: string, date: Date): Promise<Setlist | null>;
export { axios as setlistfmHttp };
//# sourceMappingURL=setlistfm.d.ts.map