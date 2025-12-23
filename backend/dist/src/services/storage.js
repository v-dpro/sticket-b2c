"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAvatar = uploadAvatar;
exports.uploadLogPhoto = uploadLogPhoto;
exports.deleteImageByUrl = deleteImageByUrl;
const client_s3_1 = require("@aws-sdk/client-s3");
const sharp_1 = __importDefault(require("sharp"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const errorHandler_1 = require("../middleware/errorHandler");
function requireEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new errorHandler_1.AppError(`${name} is required`, 500);
    return v;
}
function getR2Client() {
    const accountId = requireEnv('R2_ACCOUNT_ID');
    const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
    const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');
    return new client_s3_1.S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
}
function publicUrlForKey(key) {
    const base = requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
    return `${base}/${key}`;
}
async function uploadAvatar(buffer, userId) {
    const client = getR2Client();
    const bucket = requireEnv('R2_BUCKET_NAME');
    const hash = node_crypto_1.default.randomBytes(16).toString('hex');
    const key = `avatars/${userId}/${hash}.webp`;
    const body = await (0, sharp_1.default)(buffer)
        .resize(400, 400, { fit: 'cover', position: 'center' })
        .webp({ quality: 85 })
        .toBuffer();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: 'image/webp',
    }));
    return publicUrlForKey(key);
}
async function uploadLogPhoto(buffer, userId) {
    const client = getR2Client();
    const bucket = requireEnv('R2_BUCKET_NAME');
    const hash = node_crypto_1.default.randomBytes(16).toString('hex');
    const fullKey = `photos/${userId}/${hash}.webp`;
    const full = await (0, sharp_1.default)(buffer)
        .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: fullKey,
        Body: full,
        ContentType: 'image/webp',
    }));
    const thumbKey = `photos/${userId}/${hash}_thumb.webp`;
    const thumb = await (0, sharp_1.default)(buffer).resize(300, 300, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    await client.send(new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: thumbKey,
        Body: thumb,
        ContentType: 'image/webp',
    }));
    return {
        url: publicUrlForKey(fullKey),
        thumbnailUrl: publicUrlForKey(thumbKey),
    };
}
async function deleteImageByUrl(url) {
    const client = getR2Client();
    const bucket = requireEnv('R2_BUCKET_NAME');
    const publicUrl = requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
    const key = url.startsWith(publicUrl) ? url.slice(publicUrl.length + 1) : url;
    await client.send(new client_s3_1.DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
    }));
}
//# sourceMappingURL=storage.js.map