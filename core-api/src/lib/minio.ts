// core-api/src/lib/minio.ts
// FULL REPLACEMENT — fixes issue #16
//
// What changed:
//   1. Config comes from validated env; TLS is a setting, not a hardcoded false.
//   2. getFileUrl() no longer hands out permanent, guessable object URLs for
//      everything. Private assets (NID photos, bank proofs, CVs, task proofs)
//      now go through presignedUrl() with a short TTL. Only genuinely public
//      assets use publicUrl().
//   3. ensureBucket() also applies a public-read policy to the `public/` prefix
//      only, so avatars and cover images stay cacheable while private folders
//      remain unreachable without a signature.

import * as Minio from 'minio';
import { env } from '../config/env';

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const BUCKET = env.MINIO_BUCKET;

/** Folders whose objects may be served without a signature. */
export const PUBLIC_PREFIXES = ['public/'] as const;

/** Folders that must always be served through a presigned URL. */
export const PRIVATE_FOLDERS = ['nid', 'bank', 'cv', 'proof', 'documents'] as const;

export function isPrivatePath(path: string): boolean {
  return PRIVATE_FOLDERS.some((f) => path.startsWith(`${f}/`));
}

export async function ensureBucket(): Promise<void> {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'us-east-1');
    console.log(`Bucket '${BUCKET}' created`);
  }

  // Public read for the public/ prefix ONLY. Everything else requires a signature.
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${BUCKET}/public/*`],
      },
    ],
  };
  await minioClient.setBucketPolicy(BUCKET, JSON.stringify(policy)).catch((e) => {
    console.warn('Could not set bucket policy:', e?.message);
  });
}

const scheme = env.MINIO_USE_SSL ? 'https' : 'http';
const defaultPort = env.MINIO_USE_SSL ? 443 : 80;
const hostPart =
  env.MINIO_PORT === defaultPort ? env.MINIO_ENDPOINT : `${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;

/** Permanent URL — ONLY for objects under public/. */
export function publicUrl(path: string): string {
  if (!path.startsWith('public/')) {
    throw new Error(`publicUrl() called on a private path: ${path}. Use presignedUrl().`);
  }
  return `${scheme}://${hostPart}/${BUCKET}/${path}`;
}

/** Short-lived signed URL for private objects. Default 5 minutes. */
export function presignedUrl(path: string, expirySeconds = 300): Promise<string> {
  return minioClient.presignedGetObject(BUCKET, path, expirySeconds);
}

/**
 * Safe default used by services: public objects get a permanent URL, private
 * objects get a signed one. Callers no longer have to remember which is which.
 */
export async function urlFor(path: string, expirySeconds = 300): Promise<string> {
  return isPrivatePath(path) ? presignedUrl(path, expirySeconds) : publicUrl(path);
}