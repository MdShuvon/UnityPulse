// core-api/src/config/env.ts
// NEW FILE — fixes issues #1, #2, #5, #8, #9, #16
//
// Every secret and environment-dependent value is validated here, once, at boot.
// If something required is missing, the process refuses to start instead of
// silently falling back to an insecure default.

import 'dotenv/config';
import { z } from 'zod';

const isProd = process.env.NODE_ENV === 'production';

/** In production a value is required; in development a dev default is allowed. */
const requiredInProd = (devDefault: string, min = 1) =>
  isProd
    ? z.string().min(min, 'required in production')
    : z.string().min(min).default(devDefault);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url(),

  // ── URLs (issue #8: no more hardcoded localhost) ──────────────────────────
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:3001'),

  // ── Secrets (issues #2, #9: no insecure fallbacks in production) ──────────
  SESSION_SECRET: requiredInProd('dev-only-session-secret-min-32-characters!!', 32),
  NID_ENCRYPTION_KEY: requiredInProd('dev-only-nid-key-min-32-characters-long!!', 32),

  // ── Redis ────────────────────────────────────────────────────────────────
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),

  // ── MinIO (issue #16) ────────────────────────────────────────────────────
  MINIO_ENDPOINT: z.string().default('localhost'),
  MINIO_PORT: z.coerce.number().int().positive().default(9000),
  MINIO_USE_SSL: z
  .string()
  .transform((v) => v === 'true' || v === '1')
  .default('false'),
  MINIO_ACCESS_KEY: requiredInProd('minioadmin'),
  MINIO_SECRET_KEY: requiredInProd('minioadmin123'),
  MINIO_BUCKET: z.string().default('unitypulse'),

  // ── Uploads (issue #5: ONE limit, shared by Fastify and fileService) ──────
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(15),

  // ── Payments (issue #1: mock must be opted into explicitly) ──────────────
  PAYMENT_MODE: z.enum(['mock', 'production']).default('production'),
  SSLCOMMERZ_STORE_ID: z.string().optional(),
  SSLCOMMERZ_STORE_PASSWORD: z.string().optional(),
  HTTPS_CERT_PATH: z.string().optional(),
  HTTPS_KEY_PATH:  z.string().optional(),
  SSLCOMMERZ_SANDBOX: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\nEnvironment validation failed. The server will not start.\n');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  console.error('\nCopy core-api/.env.example to core-api/.env and fill the values.\n');
  process.exit(1);
}

export const env = parsed.data;

// ── Cross-field rules that zod alone cannot express ────────────────────────

if (env.NODE_ENV === 'production' && env.PAYMENT_MODE === 'mock') {
  console.error(
    '\nFATAL: PAYMENT_MODE=mock in production. Mock mode marks every payment ' +
    'as successful without contacting the gateway. Refusing to start.\n'
  );
  process.exit(1);
}

if (env.PAYMENT_MODE === 'production' &&
    (!env.SSLCOMMERZ_STORE_ID || !env.SSLCOMMERZ_STORE_PASSWORD)) {
  console.error(
    '\nFATAL: PAYMENT_MODE=production requires SSLCOMMERZ_STORE_ID and ' +
    'SSLCOMMERZ_STORE_PASSWORD.\n'
  );
  process.exit(1);
}

export const MAX_UPLOAD_BYTES = env.MAX_UPLOAD_MB * 1024 * 1024;
export const isProduction = env.NODE_ENV === 'production';