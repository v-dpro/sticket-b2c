export type PushPayload = {
    title: string;
    body: string;
    data?: Record<string, unknown>;
};
export declare function sendPushNotification(_userId: string, _payload: PushPayload): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=notifications.d.ts.map