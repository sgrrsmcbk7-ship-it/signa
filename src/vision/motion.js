// Dynamic gesture detectors. Input: a short trajectory of frames in which the hand already
// has the right SHAPE. Positions are converted to "palm lengths" so detection does not depend
// on how far the user stands from the camera.
//
// Each detector returns { done, progress (0..1), issue } where issue is a coaching hint:
//   'start'  – shape is right, but the movement has not started
//   'bigger' – movement started but is too small
//   'straight' – for "down": move vertically, not sideways

const median = (arr) => {
  if (!arr.length) return 1;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function trajectory(frames, point) {
  const scale = median(frames.map((f) => f.size));
  return frames.map((f) => {
    const p = point === 'indexTip' ? f.tip : f.palm;
    return { t: f.t, x: p.x / scale, y: p.y / scale, ny: f.normY };
  });
}

/** Counts back-and-forth strokes along x with hysteresis `amp` (zig-zag detection). */
function countStrokes(values, amp) {
  if (values.length < 3) return { strokes: 0, range: 0 };
  let dir = 0;
  let extreme = values[0];
  let strokes = 0;
  let lo = values[0];
  let hi = values[0];
  for (const v of values) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
    if (dir === 0) {
      if (Math.abs(v - extreme) >= amp) {
        dir = Math.sign(v - extreme);
        strokes = 1;
        extreme = v;
      }
    } else if ((dir > 0 && v > extreme) || (dir < 0 && v < extreme)) {
      extreme = v;
    } else if (Math.abs(v - extreme) >= amp) {
      dir = -dir;
      strokes += 1;
      extreme = v;
    }
  }
  return { strokes, range: hi - lo };
}

function detectWave(pts, spec) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const { strokes, range } = countStrokes(xs, spec.amplitude);
  const yRange = Math.max(...ys) - Math.min(...ys);
  const horizontal = range >= yRange * 0.8;
  const need = spec.strokes ?? 3;
  const done = strokes >= need && horizontal;
  let issue = null;
  if (!done) issue = strokes === 0 ? (range > spec.amplitude * 0.4 ? 'bigger' : 'start') : 'continue';
  return { done, progress: Math.min(1, strokes / need), issue };
}

function detectDown(pts, spec) {
  // Largest downward travel inside the window (y grows downward in image space).
  let best = 0;
  let bestDx = 0;
  let minIdx = 0;
  for (let i = 1; i < pts.length; i++) {
    // A teleport (> 0.6 palm-lengths in one frame) is a tracking jump, not a movement.
    if (Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) > 0.6) minIdx = i;
    if (pts[i].y < pts[minIdx].y) minIdx = i;
    const dy = pts[i].y - pts[minIdx].y;
    if (dy > best) {
      best = dy;
      bestDx = Math.abs(pts[i].x - pts[minIdx].x);
    }
  }
  const startOk = spec.startMaxY == null || (pts[minIdx]?.ny ?? 0) <= spec.startMaxY;
  const straight = bestDx < best * 0.9 + 0.15;
  const done = best >= spec.distance && straight && startOk;
  let issue = null;
  if (!done) {
    if (!startOk && best > 0.3) issue = 'startHigher';
    else if (!straight) issue = 'straight';
    else issue = best > spec.distance * 0.35 ? 'bigger' : 'start';
  }
  return { done, progress: Math.min(1, best / spec.distance), issue };
}

function detectCircle(pts, spec) {
  if (pts.length < 8) return { done: false, progress: 0, issue: 'start' };
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  let total = 0;
  let radius = 0;
  let prev = null;
  for (const p of pts) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const r = Math.hypot(dx, dy);
    radius += r;
    if (r < spec.radius * 0.35) continue; // too close to centre → angle is noise
    const a = Math.atan2(dy, dx);
    if (prev != null) {
      let d = a - prev;
      if (d > Math.PI) d -= 2 * Math.PI;
      if (d < -Math.PI) d += 2 * Math.PI;
      // A real circle is smooth. A big angular step in one frame is a jump (hand re-detected
      // elsewhere), which would otherwise count as half a circle.
      if (Math.abs(d) <= 1.2) total += d;
    }
    prev = a;
  }
  radius /= pts.length;
  const turns = Math.abs(total) / (2 * Math.PI);
  const need = spec.turns ?? 0.85;
  const done = turns >= need && radius >= spec.radius;
  let issue = null;
  if (!done) issue = turns > 0.25 && radius < spec.radius ? 'bigger' : turns > 0.2 ? 'continue' : 'start';
  return { done, progress: Math.min(1, turns / need), issue };
}

const DETECTORS = { wave: detectWave, wag: detectWave, down: detectDown, circle: detectCircle };

/**
 * @param spec gesture.motion
 * @param frames [{t, palm:{x,y}, tip:{x,y}, size, normY}]  (already filtered to right-shape frames)
 */
export function detectMotion(spec, frames) {
  const now = frames.length ? frames[frames.length - 1].t : 0;
  const recent = frames.filter((f) => now - f.t <= spec.windowMs);
  if (recent.length < 4) return { done: false, progress: 0, issue: 'start' };
  return DETECTORS[spec.type](trajectory(recent, spec.point), spec);
}
