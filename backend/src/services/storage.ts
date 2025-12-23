import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import crypto from 'node:crypto';

import { AppError } from '../middleware/errorHandler';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new AppError(`${name} is required`, 500);
  return v;
}

function getR2Client() {
  const accountId = requireEnv('R2_ACCOUNT_ID');
  const accessKeyId = requireEnv('R2_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('R2_SECRET_ACCESS_KEY');

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function publicUrlForKey(key: string): string {
  const base = requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '');
  return `${base}/${key}`;
}

export type UploadFolder = 'avatars' | 'photos' | 'tickets';

export async function uploadAvatar(buffer: Buffer, userId: string): Promise<string> {
  const client = getR2Client();
  const bucket = requireEnv('R2_BUCKET_NAME');

  const hash = crypto.randomBytes(16).toString('hex');
  const key = `avatars/${userId}/${hash}.webp`;

  const body = await sharp(buffer)
    .resize(400, 400, { fit: 'cover', position: 'center' })
    .webp({ quality: 85 })
    .toBuffer();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'image/webp',
    })
  );

  return publicUrlForKey(key);
}

export async function uploadLogPhoto(buffer: Buffer, userId: string): Promise<{ url: string; thumbnailUrl: string }> {
  const client = getR2Client();
  const bucket = requireEnv('R2_BUCKET_NAME');

  const hash = crypto.randomBytes(16).toString('hex');

  const fullKey = `photos/${userId}/${hash}.webp`;
  const full = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: fullKey,
      Body: full,
      ContentType: 'image/webp',
    })
  );

  const thumbKey = `photos/${userId}/${hash}_thumb.webp`;
  const thumb = await sharp(buffer).resize(300, 300, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: thumbKey,
      Body: thumb,
      ContentType: 'image/webp',
    })
  );

  return {
    url: publicUrlForKey(fullKey),
    thumbnailUrl: publicUrlForKey(thumbKey),
  };
}

export async function deleteImageByUrl(url: string): Promise<void> {
  const client = getR2Client();
  const bucket = requireEnv('R2_BUCKET_NAME');
  const publicUrl = requireEnv('R2_PUBLIC_URL').replace(/\/+$/, '');

  const key = url.startsWith(publicUrl) ? url.slice(publicUrl.length + 1) : url;

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}



