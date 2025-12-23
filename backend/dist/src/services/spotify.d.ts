import axios from 'axios';
export type SpotifyTokens = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
};
export declare function exchangeSpotifyCode(code: string): Promise<SpotifyTokens>;
export declare function refreshSpotifyToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
}>;
export declare function getSpotifyProfile(accessToken: string): Promise<{
    id: string;
    email?: string;
    display_name?: string;
    images?: {
        url: string;
    }[];
}>;
export declare function getSpotifyTopArtists(accessToken: string, limit?: number, timeRange?: 'short_term' | 'medium_term' | 'long_term'): Promise<any[]>;
export declare function handleSpotifyConnect(userId: string, code: string): Promise<{
    success: boolean;
    topArtists: any[];
}>;
export declare function getUserWithFreshSpotifyToken(userId: string): Promise<{
    user: any;
    spotifyToken: string | null;
}>;
export { axios as spotifyHttp };
//# sourceMappingURL=spotify.d.ts.map