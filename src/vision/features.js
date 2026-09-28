// Stage 1 of the pipeline: raw landmarks → interpretable hand features.
//
//   landmarks (image, 2D) ─┐
//                          ├─► finger curl (joint angles + tip/knuckle distance ratio)
//   world landmarks (3D) ──┤   thumb extension, pointing directions, finger spread,
//   handedness ────────────┘   fingertip contacts, palm orientation, framing
//
// Shape features use MediaPipe *world* landmarks (metric 3D, rotation-stable).
// Direction / motion / framing features use image landmarks in pixel space.

import {
  LM, FINGERS, FINGER_JOINTS, clamp01, sub, dist, dist2, bendDeg, toPixels,
} from './landmarks.js';

// Calibrated on real MediaPipe world landmarks (see README → "Calibration"):
//   straight finger: joint-bend sum 40–75°,  tip/knuckle distance ratio 1.72–1.87
//   folded finger:   joint-bend sum 130–215°, ratio 0.8–1.2
const STRAIGHT_RATIO = { index: 1.75, middle: 1.8, ring: 1.75, pinky: 1.65 };
const FOLDED_RATIO = 1.1;
const BEND_STRAIGHT = 60;
const BEND_FOLDED = 170;

/**
 * @param {{landmarks: Array, world: Array, handedness?: string}} hand
 * @param {{width:number,height:number}} frame video size in px
 * @param {{invertPalm?: boolean}} opts
 */
export function extractFeatures(hand, frame, opts = {}) {
  const img = toPixels(hand.landmarks, frame.width, frame.height);
  const w = hand.world?.length === 21 ? hand.world : img;
  const palmLen = dist(w[LM.WRIST], w[LM.MIDDLE_MCP]) || 1;

  // ── Finger curl: 0 = straight, 1 = fully folded ───────────────────────────
  const curl = {};
  const reach = {}; // 0 = tip pulled into the palm (fist), 1 = tip as far as a straight finger
  const joints = {};
  for (const f of FINGERS) {
    if (f === 'thumb') continue;
    const [mcp, pip, dip, tip] = FINGER_JOINTS[f];
    const bMcp = bendDeg(w[LM.WRIST], w[mcp], w[pip]);
    const bPip = bendDeg(w[mcp], w[pip], w[dip]);
    const bDip = bendDeg(w[pip], w[dip], w[tip]);
    const angleCurl = clamp01((bMcp + bPip + bDip - BEND_STRAIGHT) / (BEND_FOLDED - BEND_STRAIGHT));
    const ratio = dist(w[LM.WRIST], w[tip]) / (dist(w[LM.WRIST], w[mcp]) || 1);
    const ratioCurl = clamp01((STRAIGHT_RATIO[f] - ratio) / (STRAIGHT_RATIO[f] - FOLDED_RATIO));
    curl[f] = 0.5 * angleCurl + 0.5 * ratioCurl;
    reach[f] = 1 - ratioCurl;
    joints[f] = { mcp: bMcp, pip: bPip, dip: bDip, ratio };
  }

  // ── Thumb: extension is judged by how far the tip is from the other fingers
  //    (a tucked thumb rests on them) + how straight the thumb is.
  const tTip = w[LM.THUMB_TIP];
  const nearest = Math.min(
    ...[
      LM.INDEX_MCP, LM.INDEX_PIP, LM.INDEX_DIP,
      LM.MIDDLE_MCP, LM.MIDDLE_PIP, LM.MIDDLE_DIP,
      LM.RING_MCP, LM.RING_PIP, LM.RING_DIP,
    ].map((i) => dist(tTip, w[i])),
  ) / palmLen;
  const tBend =
    bendDeg(w[LM.THUMB_CMC], w[LM.THUMB_MCP], w[LM.THUMB_IP]) +
    bendDeg(w[LM.THUMB_MCP], w[LM.THUMB_IP], w[LM.THUMB_TIP]);
  const thumbStraight = clamp01(1 - (tBend - 25) / 90);
  const thumbExt = 0.7 * clamp01((nearest - 0.18) / 0.3) + 0.3 * thumbStraight;
  curl.thumb = 1 - thumbExt;
  joints.thumb = { nearest, bend: tBend };

  // ── Directions (2D, pixel space, y grows downward) ─────────────────────────
  const dirs = {
    hand: sub(img[LM.MIDDLE_MCP], img[LM.WRIST]),
    thumb: sub(img[LM.THUMB_TIP], img[LM.THUMB_MCP]),
    index: sub(img[LM.INDEX_TIP], img[LM.INDEX_MCP]),
    middle: sub(img[LM.MIDDLE_TIP], img[LM.MIDDLE_MCP]),
    ring: sub(img[LM.RING_TIP], img[LM.RING_MCP]),
    pinky: sub(img[LM.PINKY_TIP], img[LM.PINKY_MCP]),
  };

  // ── Spread: fingertip gap relative to knuckle gap (≈1 together, >2 spread) ─
  const gap = (a, b) =>
    dist(w[FINGER_JOINTS[a][3]], w[FINGER_JOINTS[b][3]]) /
    (dist(w[FINGER_JOINTS[a][0]], w[FINGER_JOINTS[b][0]]) || 1);
  const spread = {
    indexMiddle: gap('index', 'middle'),
    middleRing: gap('middle', 'ring'),
    ringPinky: gap('ring', 'pinky'),
  };

  // ── Contacts: thumb tip to other fingertips, in palm lengths ──────────────
  const touch = {
    thumbIndex: dist(tTip, w[LM.INDEX_TIP]) / palmLen,
    thumbMiddle: dist(tTip, w[LM.MIDDLE_TIP]) / palmLen,
    thumbRing: dist(tTip, w[LM.RING_TIP]) / palmLen,
    thumbPinky: dist(tTip, w[LM.PINKY_TIP]) / palmLen,
  };

  // ── Palm orientation ──────────────────────────────────────────────────────
  // 2D cross product of (wrist→index knuckle) × (wrist→pinky knuckle). Its sign flips when
  // the palm turns away, and is opposite for left vs right hands. We feed MediaPipe the raw
  // (non-mirrored) camera frame; verified on real photos (tests/fixtures), the handedness label
  // then matches the user's actual hand. For a right hand facing the camera the cross is < 0.
  const v1 = sub(img[LM.INDEX_MCP], img[LM.WRIST]);
  const v2 = sub(img[LM.PINKY_MCP], img[LM.WRIST]);
  const cross = (v1.x * v2.y - v1.y * v2.x) / ((Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y)) || 1);
  const userRight = hand.handedness ? hand.handedness === 'Right' : true;
  let palmFacing = userRight ? -cross : cross; // >0 palm toward camera, <0 back of hand
  if (opts.invertPalm) palmFacing = -palmFacing;

  // ── Framing ───────────────────────────────────────────────────────────────
  const xs = hand.landmarks.map((p) => p.x);
  const ys = hand.landmarks.map((p) => p.y);
  const bbox = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  const palmPx = dist2(img[LM.WRIST], img[LM.MIDDLE_MCP]) || 1;
  const handSize = palmPx / Math.min(frame.width, frame.height);

  const palmIdx = [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP];
  const palmCenter = {
    x: palmIdx.reduce((s, i) => s + img[i].x, 0) / palmIdx.length,
    y: palmIdx.reduce((s, i) => s + img[i].y, 0) / palmIdx.length,
  };

  return {
    curl,
    reach,
    joints,
    dirs,
    spread,
    touch,
    palmFacing,
    handedness: userRight ? 'right' : 'left',
    bbox,
    handSize,
    palmPx,
    palmCenter,
    indexTip: { x: img[LM.INDEX_TIP].x, y: img[LM.INDEX_TIP].y },
    normY: palmCenter.y / frame.height,
  };
}
