export type PushPayload = {
    title: string;
    body: string;
    data?: Record<string, unknown>;
};
export declare function sendPushNotification(userId: string, payload: PushPayload): Promise<void>;
//# sourceMappingURL=notifications.d.ts.map