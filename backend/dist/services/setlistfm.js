"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setlistfmHttp = void 0;
exports.getSetlistForEvent = getSetlistForEvent;
const axios_1 = __importDefault(require("axios"));
exports.setlistfmHttp = axios_1.default;
async function getSetlistForEvent(_externalId) {
    // TODO: Implement Setlist.fm API integration
    return null;
}
//# sourceMappingURL=setlistfm.js.map