// Copies the MediaPipe WASM runtime into /public so the app does not depend on a CDN at runtime.
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/@mediapipe/tasks-vision/wasm');
const dest = resolve(root, 'public/mediapipe/wasm');

if (!existsSync(src)) {
  console.warn('[signa] @mediapipe/tasks-vision not installed yet — skipping WASM copy.');
  process.exit(0);
}
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[signa] MediaPipe WASM copied to public/mediapipe/wasm');
