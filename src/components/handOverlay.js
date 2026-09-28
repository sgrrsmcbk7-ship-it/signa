// Canvas renderer for the hand: glowing outline (convex hull), bones, joints, per-finger
// Error Mode colouring (the finger you need to fix glows red) and a hold/motion progress ring.
// The canvas is mirrored with CSS exactly like the video, so we draw in raw image coordinates.

const STATUS_COLOR = {
  searching: '#94a3b8',
  detected: '#5eead4',
  blocked: '#f87171',
  almost: '#fbbf24',
  holding: '#a78bfa',
  motion: '#a78bfa',
  confirmed: '#34d399',
};
const MARK_COLOR = { good: '#34d399', bad: '#fb7185' };

const FINGER_BONES = {
  thumb: [[0, 1], [1, 2], [2, 3], [3, 4]],
  index: [[5, 6], [6, 7], [7, 8]],
  middle: [[9, 10], [10, 11], [11, 12]],
  ring: [[13, 14], [14, 15], [15, 16]],
  pinky: [[17, 18], [18, 19], [19, 20]],
};
const PALM_BONES = [[0, 5], [5, 9], [9, 13], [13, 17], [0, 17]];
const TIP_OF = { 4: 'thumb', 8: 'index', 12: 'middle', 16: 'ring', 20: 'pinky' };
const FINGER_OF_POINT = (i) => (i === 0 ? null : ['thumb', 'index', 'middle', 'ring', 'pinky'][Math.floor((i - 1) / 4)]);

function convexHull(points) {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function roundedPath(ctx, pts, pad = 0) {
  if (!pts.length) return;
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  const exp = pts.map((p) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const l = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / l) * pad, y: p.y + (dy / l) * pad };
  });
  ctx.beginPath();
  for (let i = 0; i < exp.length; i++) {
    const a = exp[i];
    const b = exp[(i + 1) % exp.length];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(a.x, a.y, mx, my);
  }
  const a = exp[0];
  const b = exp[1 % exp.length];
  ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  ctx.closePath();
}

export function drawOverlay(canvas, out, video, settings) {
  if (!canvas || !video) return;
  const W = video.videoWidth;
  const H = video.videoHeight;
  if (canvas.width !== W || canvas.height !== H) {
    canvas.width = W;
    canvas.height = H;
  }
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  if (!out?.landmarks?.length) return;

  const unit = Math.min(W, H) / 480; // scale strokes with resolution
  const now = performance.now();
  const status = out.status;
  const base = STATUS_COLOR[status] ?? STATUS_COLOR.detected;
  const marks = out.diag?.fingerMarks ?? {};

  out.landmarks.forEach((lm, handIdx) => {
    const primary = handIdx === out.primary;
    const pts = lm.map((p) => ({ x: p.x * W, y: p.y * H }));
    const color = primary ? base : '#64748b';

    // Outline / hull glow
    ctx.save();
    roundedPath(ctx, convexHull(pts), 18 * unit);
    ctx.fillStyle = `${color}1f`;
    ctx.fill();
    ctx.lineWidth = 2 * unit;
    ctx.strokeStyle = `${color}aa`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 * unit;
    ctx.setLineDash([8 * unit, 6 * unit]);
    ctx.lineDashOffset = -now / 40;
    ctx.stroke();
    ctx.restore();

    if (settings?.showSkeleton === false && primary) {
      drawProgress(ctx, out, unit);
      return;
    }

    // Bones
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 4 * unit;
    ctx.shadowBlur = 10 * unit;
    ctx.strokeStyle = `${color}cc`;
    ctx.shadowColor = color;
    for (const [a, b] of PALM_BONES) {
      ctx.beginPath();
      ctx.moveTo(pts[a].x, pts[a].y);
      ctx.lineTo(pts[b].x, pts[b].y);
      ctx.stroke();
    }
    for (const [finger, bones] of Object.entries(FINGER_BONES)) {
      const c = primary && marks[finger] ? MARK_COLOR[marks[finger]] : color;
      ctx.strokeStyle = c;
      ctx.shadowColor = c;
      ctx.lineWidth = (marks[finger] === 'bad' && primary ? 6 : 4) * unit;
      for (const [a, b] of bones) {
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Joints
    for (let i = 0; i < pts.length; i++) {
      const finger = FINGER_OF_POINT(i);
      const mark = primary && finger ? marks[finger] : null;
      const tip = TIP_OF[i];
      const r = (tip ? 6 : 4) * unit;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#0b1020';
      ctx.fill();
      ctx.lineWidth = 2.5 * unit;
      ctx.strokeStyle = mark ? MARK_COLOR[mark] : color;
      ctx.stroke();
      if (tip && mark === 'bad') {
        const pulse = 10 + 6 * (0.5 + 0.5 * Math.sin(now / 140));
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, pulse * unit, 0, Math.PI * 2);
        ctx.strokeStyle = `${MARK_COLOR.bad}bb`;
        ctx.lineWidth = 2 * unit;
        ctx.stroke();
      }
    }

    if (primary) drawProgress(ctx, out, unit);
  });
}

/** Progress ring around the palm (hold for static signs / motion for dynamic signs). */
function drawProgress(ctx, out, unit) {
  const progress = out.diag?.progress;
  if (!(out.status === 'holding' || out.status === 'motion') || !(progress > 0)) return;
  const c = out.features.palmCenter;
  const r = out.features.palmPx * 0.55;
  ctx.save();
  ctx.lineWidth = 6 * unit;
  ctx.strokeStyle = '#ffffff22';
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = STATUS_COLOR.holding;
  ctx.shadowColor = STATUS_COLOR.holding;
  ctx.shadowBlur = 14 * unit;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}
