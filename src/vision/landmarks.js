// MediaPipe hand landmark indices + small vector helpers used by the feature extractor.

export const LM = {
  WRIST: 0,
  THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
  INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
  MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
  RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
  PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
};

export const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

// [base, joint1, joint2, tip] for every finger
export const FINGER_JOINTS = {
  thumb: [1, 2, 3, 4],
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: (a.z ?? 0) - (b.z ?? 0) });
export const len = (v) => Math.hypot(v.x, v.y, v.z ?? 0);
export const len2 = (v) => Math.hypot(v.x, v.y);
export const dist = (a, b) => len(sub(a, b));
export const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const dot = (a, b) => a.x * b.x + a.y * b.y + (a.z ?? 0) * (b.z ?? 0);

export function angleDeg(u, v) {
  const d = len(u) * len(v);
  if (!d) return 0;
  const c = Math.max(-1, Math.min(1, dot(u, v) / d));
  return (Math.acos(c) * 180) / Math.PI;
}

/** Bend at joint b of the chain a→b→c. 0° = perfectly straight. */
export function bendDeg(a, b, c) {
  return angleDeg(sub(b, a), sub(c, b));
}

/** Angle (deg) between a 2D vector and a unit target direction. */
export function angle2D(v, target) {
  const l = len2(v);
  if (!l) return 180;
  const c = Math.max(-1, Math.min(1, (v.x * target.x + v.y * target.y) / l));
  return (Math.acos(c) * 180) / Math.PI;
}

/** Converts normalized landmarks to pixel space so x and y share a scale. */
export function toPixels(landmarks, w, h) {
  return landmarks.map((p) => ({ x: p.x * w, y: p.y * h, z: (p.z ?? 0) * w }));
}
