// Thin wrapper around MediaPipe Tasks Vision HandLandmarker.
// MediaPipe only gives us 21 landmarks per hand — every decision about *what sign* it is
// happens in our own code (features → rules → classifier → engine).

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { MEDIAPIPE } from '../config.js';

async function loadFileset() {
  try {
    return await FilesetResolver.forVisionTasks(MEDIAPIPE.wasmPath);
  } catch (err) {
    console.warn('[signa] local WASM failed, using CDN', err);
    return FilesetResolver.forVisionTasks(MEDIAPIPE.wasmCdnFallback);
  }
}

export async function createHandTracker() {
  const fileset = await loadFileset();
  const options = (delegate) => ({
    baseOptions: { modelAssetPath: MEDIAPIPE.modelUrl, delegate },
    runningMode: 'VIDEO',
    numHands: MEDIAPIPE.numHands,
    minHandDetectionConfidence: MEDIAPIPE.minHandDetectionConfidence,
    minHandPresenceConfidence: MEDIAPIPE.minHandPresenceConfidence,
    minTrackingConfidence: MEDIAPIPE.minTrackingConfidence,
  });
  let landmarker;
  let delegate = 'GPU';
  try {
    landmarker = await HandLandmarker.createFromOptions(fileset, options('GPU'));
  } catch (err) {
    console.warn('[signa] GPU delegate unavailable, falling back to CPU', err);
    delegate = 'CPU';
    landmarker = await HandLandmarker.createFromOptions(fileset, options('CPU'));
  }

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
}
