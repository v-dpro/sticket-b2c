"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = sendPushNotification;
const expo_server_sdk_1 = require("expo-server-sdk");
const prisma_1 = __importDefault(require("../prisma"));
const expo = new expo_server_sdk_1.Expo();
async function sendPushNotification(userId, notification) {
    const tokens = await prisma_1.default.pushToken.findMany({
        where: { userId },
        select: { token: true },
    });
    if (!tokens.length)
        return;
    const messages = tokens
        .filter((t) => expo_server_sdk_1.Expo.isExpoPushToken(t.token))
        .map((t) => ({
        to: t.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data,
    }));
    if (!messages.length)
        return;
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
        try {
            await expo.sendPushNotificationsAsync(chunk);
        }
        catch (error) {
            // eslint-disable-next-line no-console
            console.error('Error sending push notification:', error);
        }
    }
}
//# sourceMappingURL=sendPush.js.map