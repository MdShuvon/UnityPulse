import { MultipartFile } from '@fastify/multipart';
import { minioClient, BUCKET, getFileUrl } from '../lib/minio';
import crypto from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const ALLOWED_TYPES: Record<string, string[]> = {
  nid:   ['image/jpeg', 'image/png'],
  cv:    ['application/pdf'],
  proof: ['image/jpeg', 'image/png', 'application/pdf'],
  post:  ['image/jpeg', 'image/png', 'image/webp'],
  bank:  ['image/jpeg', 'image/png', 'application/pdf'],
  documents: ['image/jpeg', 'image/png', 'application/pdf'],
};

const MAX_MB = 5;

export class FileService {

  validate(mimetype: string, folder: keyof typeof ALLOWED_TYPES): void {
    const allowed = ALLOWED_TYPES[folder];
    if (!allowed || !allowed.includes(mimetype)) {
      throw new Error(`Invalid file type. Allowed: ${allowed?.join(', ')}`);
    }
  }

  async upload(
    file: MultipartFile,
    folder: string
  ): Promise<string> {
    // Validate type
    this.validate(file.mimetype, folder as any);

    // Unique filename
    const ext  = file.filename.split('.').pop();
    const name = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    // File buffer read
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Size check
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > MAX_MB) {
      throw new Error(`File too large. Max ${MAX_MB}MB allowed.`);
    }

    // MinIO তে upload
    await minioClient.putObject(
      BUCKET,
      name,
      Readable.from(buffer),
      buffer.length,
      { 'Content-Type': file.mimetype }
    );

    return name; // path return করো
  }

  async delete(path: string): Promise<void> {
    await minioClient.removeObject(BUCKET, path);
  }

  getUrl(path: string): string {
    return getFileUrl(path);
  }

  // Buffer থেকে upload — stream issue এড়াতে
  async uploadBuffer(
    buffer:   Buffer,
    mimetype: string,
    filename: string,
    folder:   string
  ): Promise<string> {
    // Type validate করো
    this.validate(mimetype, folder as any);

    // Size validate করো
    const sizeMB = buffer.length / (1024 * 1024);
    if (sizeMB > MAX_MB) {
      throw new Error(`File too large. Max ${MAX_MB}MB allowed.`);
    }

    // Unique filename
    const ext  = filename.split('.').pop() || 'bin';
    const name = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;

    const { Readable } = await import('stream');

    // MinIO তে upload
    await minioClient.putObject(
      BUCKET, name,
      Readable.from(buffer),
      buffer.length,
      { 'Content-Type': mimetype }
    );

    return name;
  }    

}

export const fileService = new FileService();