export type UploadFolder = 'avatars' | 'photos' | 'tickets';
export declare function uploadAvatar(buffer: Buffer, userId: string): Promise<string>;
export declare function uploadLogPhoto(buffer: Buffer, userId: string): Promise<{
    url: string;
    thumbnailUrl: string;
}>;
export declare function deleteImageByUrl(url: string): Promise<void>;
//# sourceMappingURL=storage.d.ts.map