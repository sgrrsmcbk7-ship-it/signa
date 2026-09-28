// Central tuning knobs. Everything the recognizer "decides" is driven from here + src/data/gestures.js.

export const MEDIAPIPE = {
  wasmPath: `${import.meta.env?.BASE_URL ?? '/'}mediapipe/wasm`,
  wasmCdnFallback: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm',
  modelUrl:
    'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  numHands: 2, // we track 2 so Error Mode can say "show only one hand"
  minHandDetectionConfidence: 0.6,
  minHandPresenceConfidence: 0.6,
  minTrackingConfidence: 0.5,
};

export const ENGINE = {
  // Static classification
  matchThreshold: 0.8, // weighted rule-match needed to accept a gesture
  minConstraint: 0.45, // no single rule may score below this
  nearMissThreshold: 0.55, // below this we do not try to coach towards a gesture
  dynamicShapeMin: 0.72, // hand-shape match needed while a dynamic gesture is moving

  // Temporal validation
  holdMs: 650, // static gesture must be held this long (≈ 18–20 frames at 30 fps)
  stableRange: 0.45, // max palm-centre drift during a hold, in palm-lengths
  cooldownMs: 1300, // after a confirmation nothing else fires for this long
  releaseMs: 350, // same word can fire again only after the hand changed for this long
  historyMs: 2200, // how much motion history we keep

  // Error Mode
  noHandHintMs: 700,
  diagDebounceMs: 260, // a coaching hint must be stable this long before it replaces the current one
  diagClearMs: 450,
  handStillMs: 280, // live mode: coach only when the hand has settled
  confirmFlashMs: 1500,

  // Framing
  minHandSize: 0.075, // palm length / min(frame w,h)
  maxHandSize: 0.42,
  edgeMargin: 0.005,
};

export const SENSITIVITY = {
  relaxed: { hold: 0.75, match: -0.05 },
  normal: { hold: 1, match: 0 },
  strict: { hold: 1.35, match: 0.05 },
};

export const DEFAULT_SETTINGS = {
  lang: 'en',
  voice: true,
  voiceURI: '',
  rate: 1,
  sfx: true,
  sensitivity: 'normal',
  showSkeleton: true,
  largeText: false,
  highContrast: false,
  debug: false,
  invertPalm: false,
};
