// Thin wrapper around MediaPipe Tasks Vision HandLandmarker.
// MediaPipe only gives us 21 landmarks per hand — every decision about *what sign* it is
// happens in our own code (features → rules → classifier → engine).

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { MEDIAPIPE } from '../config.js';

const LOAD_TIMEOUT_MS = 30000;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms)),
  ]);
}

function options(delegate) {
  return {
    baseOptions: { modelAssetPath: MEDIAPIPE.modelUrl, delegate },
    runningMode: 'VIDEO',
    numHands: MEDIAPIPE.numHands,
    minHandDetectionConfidence: MEDIAPIPE.minHandDetectionConfidence,
    minHandPresenceConfidence: MEDIAPIPE.minHandPresenceConfidence,
    minTrackingConfidence: MEDIAPIPE.minTrackingConfidence,
  };
}

async function createFrom(wasmPath) {
  const fileset = await FilesetResolver.forVisionTasks(wasmPath);
  try {
    return { landmarker: await HandLandmarker.createFromOptions(fileset, options('GPU')), delegate: 'GPU' };
  } catch (err) {
    console.warn('[signa] GPU delegate unavailable, falling back to CPU', err);
    return { landmarker: await HandLandmarker.createFromOptions(fileset, options('CPU')), delegate: 'CPU' };
  }
}

export async function createHandTracker() {
  // Production: a version-pinned CDN is the fastest and most reliable source of the ~11 MB WASM;
  // the self-hosted copy (public/mediapipe/wasm) is the fallback. In dev the local copy goes first.
  const sources = import.meta.env.PROD
    ? [MEDIAPIPE.wasmCdnFallback, MEDIAPIPE.wasmPath]
    : [MEDIAPIPE.wasmPath, MEDIAPIPE.wasmCdnFallback];

  let lastError;
  for (const src of sources) {
    try {
      const { landmarker, delegate } = await withTimeout(createFrom(src), LOAD_TIMEOUT_MS, `MediaPipe (${src})`);
      let lastTs = -1;
      return {
        delegate,
        /** Runs detection on the current video frame. Timestamps must strictly increase. */
        detect(video, now) {
          const ts = Math.max(now, lastTs + 1);
          lastTs = ts;
          return landmarker.detectForVideo(video, ts);
        },
        close() {
          landmarker.close();
        },
      };
    } catch (err) {
      console.warn('[signa] could not start MediaPipe from', src, err);
      lastError = err;
    }
  }
  throw lastError;
}
