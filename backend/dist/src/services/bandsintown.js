"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bandsintownHttp = void 0;
exports.getBandsintownEventsForArtist = getBandsintownEventsForArtist;
const axios_1 = __importDefault(require("axios"));
exports.bandsintownHttp = axios_1.default;
const BANDSINTOWN_API = 'https://rest.bandsintown.com';
const APP_ID = process.env.BANDSINTOWN_APP_ID || 'sticket';
async function getBandsintownEventsForArtist(artistName) {
    try {
        const encodedName = encodeURIComponent(artistName);
        const url = `${BANDSINTOWN_API}/artists/${encodedName}/events`;
        const res = await axios_1.default.get(url, { params: { app_id: APP_ID } });
        if (!Array.isArray(res.data))
            return [];
        return res.data;
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Bandsintown fetch failed for ${artistName}:`, error);
        return [];
    }
}
//# sourceMappingURL=bandsintown.js.map