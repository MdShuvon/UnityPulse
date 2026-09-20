// core-api/src/services/fileService.ts
// FULL REPLACEMENT — fixes issue #5, supports #16
//
// What changed:
//   1. The size limit is no longer duplicated. Both Fastify's multipart plugin
//      and this service read MAX_UPLOAD_BYTES from config/env.ts, so the two can
//      never disagree again.
//   2. The file is streamed to MinIO instead of being fully buffered in memory.
//      Buffering meant a 15 MB upload held 15 MB of heap per concurrent request.
//   3. file.file.truncated is checked — Fastify silently truncates oversized
//      streams rather than throwing, so without this a too-large upload was
//      being stored as a corrupt partial file.
//   4. Extensions are derived from the validated MIME type, not from the
//      user-supplied filename, so "evil.pdf.exe" cannot pick its own extension.
//   5. Public assets go under public/, private ones keep their own folder, which
//      is what the new bucket policy in lib/minio.ts keys off.

import { MultipartFile } from '@fastify/multipart';
import { minioClient, BUCKET, urlFor } from '../lib/minio';
import { MAX_UPLOAD_BYTES, env } from '../config/env';
import crypto from 'crypto';

export const ALLOWED_TYPES = {
  nid: ['image/jpeg', 'image/png'],
  cv: ['application/pdf'],
  proof: ['image/jpeg', 'image/png', 'application/pdf'],
  post: ['image/jpeg', 'image/png', 'image/webp'],
  bank: ['image/jpeg', 'image/png', 'application/pdf'],
  documents: ['image/jpeg', 'image/png', 'application/pdf'],
  avatar: ['image/jpeg', 'image/png', 'image/webp'],
  cover: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

export type UploadFolder = keyof typeof ALLOWED_TYPES;

/** Folders whose objects are safe to serve without a signature. */
const PUBLIC_FOLDERS: UploadFolder[] = ['post', 'avatar', 'cover'];

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export class FileService {

  validate(mimetype: string, folder: UploadFolder): void {
    const allowed = ALLOWED_TYPES[folder];
    if (!allowed) throw new Error(`Unknown upload folder: ${folder}`);
    if (!allowed.includes(mimetype as never)) {
      throw new Error(
        `Invalid file type "${mimetype}". Allowed: ${allowed.join(', ')}`,
      );
    }
  }

  /** Build the object key. Extension comes from the MIME type, never the filename. */
  private buildKey(folder: UploadFolder, mimetype: string): string {
    const ext = EXT_BY_MIME[mimetype] ?? 'bin';
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    return PUBLIC_FOLDERS.includes(folder)
      ? `public/${folder}/${unique}`
      : `${folder}/${unique}`;
  }

  /** Stream a multipart file straight to MinIO. Returns the object key. */
  async upload(file: MultipartFile, folder: UploadFolder): Promise<string> {
    this.validate(file.mimetype, folder);

    const key = this.buildKey(folder, file.mimetype);

    // Size is enforced by @fastify/multipart's limits.fileSize. When the stream
    // exceeds it, Fastify truncates instead of throwing, so check the flag.
    await minioClient.putObject(BUCKET, key, file.file, undefined, {
      'Content-Type': file.mimetype,
    });

    if ((file.file as any).truncated) {
      await this.delete(key).catch(() => {});
      throw new Error(`File too large. Max ${env.MAX_UPLOAD_MB}MB allowed.`);
    }

    return key;
  }

  /** For files already in memory (e.g. generated images). */
  async uploadBuffer(
    buffer: Buffer,
    mimetype: string,
    folder: UploadFolder,
  ): Promise<string> {
    this.validate(mimetype, folder);

    if (buffer.length > MAX_UPLOAD_BYTES) {
      throw new Error(`File too large. Max ${env.MAX_UPLOAD_MB}MB allowed.`);
    }

    const key = this.buildKey(folder, mimetype);
    await minioClient.putObject(BUCKET, key, buffer, buffer.length, {
      'Content-Type': mimetype,
    });
    return key;
  }

  async delete(key: string): Promise<void> {
    await minioClient.removeObject(BUCKET, key);
  }

  /**
   * Resolve a stored key to a URL the browser can use.
   * Public folders get a permanent URL; private ones get a short-lived signature.
   */
  async getUrl(key: string, expirySeconds = 300): Promise<string> {
    return urlFor(key, expirySeconds);
  }
}

export const fileService = new FileService();