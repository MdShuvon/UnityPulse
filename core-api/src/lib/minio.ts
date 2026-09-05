import * as Minio from 'minio';

export const minioClient = new Minio.Client({
  endPoint:        process.env.MINIO_ENDPOINT || 'localhost',
  port:            Number(process.env.MINIO_PORT) || 9000,
  useSSL:          false,
  accessKey:       process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey:       process.env.MINIO_SECRET_KEY || 'minioadmin123',
});

export const BUCKET = process.env.MINIO_BUCKET || 'unitypulse';

// Bucket আছে কিনা check করো, না থাকলে বানাও
export async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET, 'us-east-1');
    console.log(`Bucket '${BUCKET}' created`);
  }
}

// File এর public URL বানাও
export function getFileUrl(path: string): string {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = process.env.MINIO_PORT || '9000';
  return `http://${endpoint}:${port}/${BUCKET}/${path}`;
}