"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bandsintownHttp = void 0;
exports.getBandsintownEventsForArtist = getBandsintownEventsForArtist;
const axios_1 = __importDefault(require("axios"));
exports.bandsintownHttp = axios_1.default;
async function getBandsintownEventsForArtist(artistName) {
    // TODO: Implement Bandsintown events fetch
    void artistName;
    return [];
}
//# sourceMappingURL=bandsintown.js.map