"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.spotifyHttp = void 0;
exports.exchangeSpotifyCodeForTokens = exchangeSpotifyCodeForTokens;
exports.getSpotifyArtist = getSpotifyArtist;
const axios_1 = __importDefault(require("axios"));
exports.spotifyHttp = axios_1.default;
async function exchangeSpotifyCodeForTokens(code) {
    // TODO: Implement Spotify OAuth token exchange
    // https://developer.spotify.com/documentation/web-api/tutorials/code-flow
    void code;
    return null;
}
async function getSpotifyArtist(_spotifyId) {
    // TODO: Implement Spotify artist fetch
    return null;
}
//# sourceMappingURL=spotify.js.map