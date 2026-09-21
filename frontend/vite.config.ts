import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

const certDir = path.resolve(__dirname, '../certs');
const certKey = path.join(certDir, 'localhost+2-key.pem');
const certPem = path.join(certDir, 'localhost+2.pem');

// HTTPS only when certs exist locally (dev). CI/production build skips it.
const httpsConfig =
  fs.existsSync(certKey) && fs.existsSync(certPem)
    ? { key: fs.readFileSync(certKey), cert: fs.readFileSync(certPem) }
    : undefined;

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    ...(httpsConfig ? { https: httpsConfig } : {}),
  },
});