// Stage 2: rule primitives. Each rule turns ONE feature into a soft score in [0..1]
// AND knows how to explain itself when it fails. That second part is what powers Error Mode:
// the classifier never just says "not recognized"; every failing rule carries a concrete fix.

import { clamp01, angle2D } from './landmarks.js';

// Priority = the order in which problems are reported (lower = more fundamental).
export const PRIORITY = {
  framing: 1, // hand not visible / too small / cut off / two hands  (see diagnostics.js)
  orientation: 3, // palm facing, hand / finger / thumb direction
  fingers: 4, // which fingers are up or down
  detail: 5, // spread, fingertip contact
  hold: 6, // stability and hold duration
  motion: 6, // dynamic gestures
};

const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// Linear ramp: 0 at `zero`, 1 at `one` (works in both directions).
const ramp = (v, zero, one) => clamp01((v - zero) / (one - zero));

/** Score for "angle ≤ good → 1, angle ≥ bad → 0". */
const angleScore = (deg, good = 35, bad = 65) => clamp01((bad - deg) / (bad - good));

function directionScore(vec, expected) {
  if (expected === 'side') {
    return angleScore(Math.min(angle2D(vec, DIRS.left), angle2D(vec, DIRS.right)), 30, 60);
  }
  return angleScore(angle2D(vec, DIRS[expected]));
}

// ── Finger state ────────────────────────────────────────────────────────────
// curl: 0 = straight, 1 = folded. Thumb gets slightly different bands.
// "bent" (claw / pinch) = joints clearly curled, but the tip is NOT pulled into the palm.
// `reach` (tip distance) is what separates a claw from a fist.
const bentScore = (c, reach = 0.5) => {
  const curlS = c < 0.35 ? ramp(c, 0.2, 0.35) : c > 0.82 ? ramp(c, 0.95, 0.82) : 1;
  const reachS = reach < 0.22 ? ramp(reach, 0.06, 0.22) : reach > 0.75 ? ramp(reach, 0.9, 0.75) : 1;
  return Math.min(curlS, reachS);
};

const STATE_SCORE = {
  extended: (c, thumb) => (thumb ? ramp(c, 0.62, 0.42) : ramp(c, 0.5, 0.3)),
  folded: (c, thumb) => (thumb ? ramp(c, 0.45, 0.62) : ramp(c, 0.5, 0.68)),
  bent: (c, thumb, reach) => bentScore(c, reach),
  notExtended: (c, thumb) => (thumb ? ramp(c, 0.38, 0.55) : ramp(c, 0.28, 0.45)),
  notFolded: (c) => ramp(c, 0.78, 0.6),
};

function fingerRule(finger, expected, f) {
  const c = f.curl[finger];
  const thumb = finger === 'thumb';
  const reach = f.reach?.[finger];
  const score = STATE_SCORE[expected](c, thumb, reach);
  let hint;
  if (expected === 'extended' || expected === 'notFolded') hint = thumb ? 'thumbOut' : 'extend';
  else if (expected === 'folded' || expected === 'notExtended') hint = thumb ? 'thumbIn' : 'fold';
  else hint = c < 0.35 ? 'bendMore' : 'bendLess';
  return {
    id: `finger.${finger}`,
    kind: 'finger',
    score,
    weight: 1,
    priority: PRIORITY.fingers,
    hint: { key: hint, finger },
    fingers: [finger],
    value: c,
  };
}

function handDirRule(expected, f) {
  return {
    id: 'dir.hand',
    kind: 'orientation',
    score: directionScore(f.dirs.hand, expected),
    weight: 0.8,
    priority: PRIORITY.orientation,
    hint: { key: `hand_${expected}` },
    fingers: [],
  };
}

function fingerDirRule(finger, expected, f) {
  return {
    id: `dir.${finger}`,
    kind: 'orientation',
    score: directionScore(f.dirs[finger], expected),
    weight: 0.9,
    priority: PRIORITY.orientation,
    hint: { key: finger === 'thumb' ? `thumb_${expected}` : `point_${expected}`, finger },
    fingers: [finger],
  };
}

function palmRule(expected, f) {
  // palmFacing ≈ sin(angle between index & pinky knuckle rays); ~0.4–0.6 when flat to camera.
  const v = expected === 'facing' ? f.palmFacing : -f.palmFacing;
  return {
    id: 'palm',
    kind: 'orientation',
    score: ramp(v, -0.02, 0.18),
    weight: 0.9,
    priority: PRIORITY.orientation,
    hint: { key: expected === 'facing' ? 'palmToCamera' : 'backToCamera' },
    fingers: [],
  };
}

function spreadRule(pair, expected, f) {
  const g = f.spread[pair];
  const score = expected === 'together' ? ramp(g, 1.9, 1.4) : ramp(g, 1.5, 2.05);
  const [a, b] = PAIR_FINGERS[pair];
  return {
    id: `spread.${pair}`,
    kind: 'detail',
    score,
    weight: 0.8,
    priority: PRIORITY.detail,
    hint: { key: expected === 'together' ? 'together' : 'apart', finger: a, finger2: b },
    fingers: [a, b],
    value: g,
  };
}

function touchRule(pair, expected, f) {
  const d = f.touch[pair];
  const score = expected ? ramp(d, 0.42, 0.22) : ramp(d, 0.22, 0.4);
  const other = PAIR_FINGERS[pair][1];
  return {
    id: `touch.${pair}`,
    kind: 'detail',
    score,
    weight: 1.1,
    priority: PRIORITY.detail,
    hint: { key: expected ? 'touch' : 'noTouch', finger: 'thumb', finger2: other },
    fingers: ['thumb', other],
    value: d,
  };
}

const PAIR_FINGERS = {
  indexMiddle: ['index', 'middle'],
  middleRing: ['middle', 'ring'],
  ringPinky: ['ring', 'pinky'],
  thumbIndex: ['thumb', 'index'],
  thumbMiddle: ['thumb', 'middle'],
  thumbRing: ['thumb', 'ring'],
  thumbPinky: ['thumb', 'pinky'],
};

/**
 * Evaluates a declarative hand-shape spec (from src/data/gestures.js) against features.
 * @returns {Array<{id,kind,score,weight,priority,hint,fingers}>}
 */
export function evaluateShape(shape, f) {
  const rules = [];
  if (shape.palm) rules.push(palmRule(shape.palm, f));
  if (shape.handDir) rules.push(handDirRule(shape.handDir, f));
  for (const [finger, dir] of Object.entries(shape.pointing ?? {})) rules.push(fingerDirRule(finger, dir, f));
  for (const [finger, state] of Object.entries(shape.fingers ?? {})) {
    if (state && state !== 'any') rules.push(fingerRule(finger, state, f));
  }
  for (const [pair, state] of Object.entries(shape.spread ?? {})) rules.push(spreadRule(pair, state, f));
  for (const [pair, state] of Object.entries(shape.touch ?? {})) rules.push(touchRule(pair, state, f));
  return rules;
}
