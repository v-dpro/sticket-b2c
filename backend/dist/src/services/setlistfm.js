"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setlistfmHttp = void 0;
exports.searchSetlists = searchSetlists;
exports.getSetlist = getSetlist;
exports.extractSongs = extractSongs;
exports.findSetlistForShow = findSetlistForShow;
exports.getSetlistForEvent = getSetlistForEvent;
const axios_1 = __importDefault(require("axios"));
exports.setlistfmHttp = axios_1.default;
const errorHandler_1 = require("../middleware/errorHandler");
const API_KEY = process.env.SETLISTFM_API_KEY;
const BASE_URL = 'https://api.setlist.fm/rest/1.0';
const client = axios_1.default.create({
    baseURL: BASE_URL,
    headers: {
        Accept: 'application/json',
        ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    },
});
function requireSetlistKey() {
    if (!process.env.SETLISTFM_API_KEY) {
        throw new errorHandler_1.AppError('Setlist.fm is not configured on this server', 501);
    }
}
function toSetlistDate(date) {
    // Setlist.fm expects DD-MM-YYYY
    const [yyyy, mm, dd] = date.toISOString().slice(0, 10).split('-');
    return `${dd}-${mm}-${yyyy}`;
}
async function searchSetlists(params) {
    requireSetlistKey();
    const response = await client.get('/search/setlists', { params });
    const setlists = (response.data?.setlist || []);
    return setlists;
}
async function getSetlist(setlistId) {
    requireSetlistKey();
    try {
        const response = await client.get(`/setlist/${setlistId}`);
        return response.data;
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('Setlist.fm get error:', error);
        return null;
    }
}
function extractSongs(setlist) {
    const songs = [];
    const sets = setlist.sets?.set ?? [];
    for (const set of sets) {
        const isEncore = Boolean(set.encore && set.encore > 0);
        for (const song of set.song ?? []) {
            if (song.tape)
                continue;
            songs.push({ name: song.name, info: song.info, isEncore });
        }
    }
    return songs;
}
async function findSetlistForShow(artistName, venueName, date) {
    requireSetlistKey();
    try {
        const dateStr = toSetlistDate(date);
        const setlists = await searchSetlists({ artistName, date: dateStr, p: 1 });
        if (!setlists.length)
            return null;
        const venueLower = venueName.toLowerCase();
        const match = setlists.find((s) => s.venue?.name?.toLowerCase().includes(venueLower) || venueLower.includes(s.venue?.name?.toLowerCase() ?? '')) ??
            setlists[0];
        return match ?? null;
    }
    catch (error) {
        // eslint-disable-next-line no-console
        console.error('Setlist.fm find error:', error);
        return null;
    }
}
async function getSetlistForEvent(artistName, venueName, date) {
    const found = await findSetlistForShow(artistName, venueName, date);
    if (!found)
        return null;
    const full = await getSetlist(found.id);
    return full ?? found;
}
//# sourceMappingURL=setlistfm.js.map