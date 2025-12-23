"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
const sendPush_1 = require("../lib/notifications/sendPush");
// Backwards-compatible service wrapper.
async function sendPushNotification(userId, payload) {
    // Keep the payload type aligned with Expo.
    const _msg = {
        title: payload.title,
        body: payload.body,
        data: payload.data,
    };
    return (0, sendPush_1.sendPushNotification)(userId, payload);
}
//# sourceMappingURL=notifications.js.map