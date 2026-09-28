// Procedural 3D hand for unit tests: builds MediaPipe-shaped results (image + world landmarks)
// for a given finger configuration, so the rule engine can be tested without a camera.
//
// Coordinates: x right, y down, z toward the viewer is negative (like MediaPipe world space).
// Base pose: the user's RIGHT hand, palm facing the camera, fingers up.

const BENDS = {
  straight: [0, 0, 0],
  relaxed: [8, 10, 5],
  folded: [90, 100, 60],
  bent: [15, 80, 60], // claw
  pinch: [55, 45, 20],
  ok: [40, 70, 40],
};

const MCP = {
  index: [0.025, -0.085, 0],
  middle: [0.003, -0.09, 0],
  ring: [-0.017, -0.085, 0],
  pinky: [-0.035, -0.075, 0],
};
const SEG = {
  index: [0.04, 0.025, 0.022],
  middle: [0.045, 0.028, 0.024],
  ring: [0.042, 0.026, 0.022],
  pinky: [0.032, 0.02, 0.019],
};

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (v, s) => [v[0] * s, v[1] * s, v[2] * s];

function fingerChain(name, bendName, splayDeg = 0) {
  const bends = BENDS[bendName];
  const sp = (splayDeg * Math.PI) / 180;
  const pts = [MCP[name]];
  let cum = 0;
  let p = MCP[name];
  for (let i = 0; i < 3; i++) {
    cum += (bends[i] * Math.PI) / 180;
    // bend toward the camera (-z), splay rotates in the x-y plane
    const dir = [Math.sin(sp) * Math.cos(cum), -Math.cos(sp) * Math.cos(cum), -Math.sin(cum)];
    p = add(p, scale(dir, SEG[name][i]));
    pts.push(p);
  }
  return pts;
}

function thumbChain(kind, tips) {
  const cmc = [0.022, -0.02, 0];
  switch (kind) {
    case 'out': // extended ~35° above horizontal
      return [cmc, [0.042, -0.034, 0], [0.062, -0.048, 0], [0.08, -0.06, 0]];
    case 'side': // extended horizontally
      return [cmc, [0.045, -0.025, 0], [0.068, -0.027, 0], [0.09, -0.028, 0]];
    case 'up': // extended straight up next to index
      return [cmc, [0.04, -0.045, 0], [0.047, -0.07, 0], [0.052, -0.095, 0]];
    case 'tucked': // across the folded fingers
      return [cmc, [0.03, -0.04, -0.012], [0.016, -0.058, -0.03], [0.001, -0.066, -0.045]];
    case 'alongside': // pressed to the side of the index finger
      return [cmc, [0.035, -0.045, -0.004], [0.038, -0.062, -0.006], [0.037, -0.078, -0.006]];
    case 'touchIndex': {
      const t = tips.index;
      return [cmc, [0.04, -0.045, -0.02], [0.04, (t[1] - 0.045) / 2, (t[2] - 0.02) / 2], [t[0] + 0.004, t[1], t[2]]];
    }
    case 'pinch': {
      const t = tips.index;
      const m = tips.middle;
      const tip = [(t[0] + m[0]) / 2, (t[1] + m[1]) / 2, (t[2] + m[2]) / 2 - 0.004];
      return [cmc, [0.04, -0.045, -0.025], [0.03, (tip[1] - 0.045) / 2, tip[2] / 2], tip];
    }
    default:
      throw new Error(`unknown thumb ${kind}`);
  }
}

/**
 * @param spec {fingers:{index,middle,ring,pinky}, thumb, splay:{finger:deg}, rotate:deg, palm:'facing'|'away',
 *              offset:{x,y} (px), user:'right'|'left', size: px per metre}
 */
export function makeHand(spec) {
  const f = { index: 'straight', middle: 'straight', ring: 'straight', pinky: 'straight', ...spec.fingers };
  const chains = {};
  const tips = {};
  for (const name of ['index', 'middle', 'ring', 'pinky']) {
    chains[name] = fingerChain(name, f[name], spec.splay?.[name] ?? 0);
    tips[name] = chains[name][3];
  }
  const thumb = thumbChain(spec.thumb ?? 'out', tips);
  let world = [[0, 0, 0], ...thumb, ...chains.index, ...chains.middle, ...chains.ring, ...chains.pinky];

  if (spec.palm === 'away') world = world.map(([x, y, z]) => [-x, y, -z]);
  if (spec.user === 'left') world = world.map(([x, y, z]) => [-x, y, z]);
  if (spec.rotate) {
    const a = (spec.rotate * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    world = world.map(([x, y, z]) => [x * c - y * s, x * s + y * c, z]);
  }

  const W = 640;
  const H = 480;
  const k = spec.size ?? 1500;
  const ox = 320 + (spec.offset?.x ?? 0);
  const oy = 360 + (spec.offset?.y ?? 0);
  const landmarks = world.map(([x, y, z]) => ({ x: (ox + x * k) / W, y: (oy + y * k) / H, z: z * 3 }));
  return {
    frame: { width: W, height: H },
    result: {
      landmarks: [landmarks],
      worldLandmarks: [world.map(([x, y, z]) => ({ x, y, z }))],
      // Non-mirrored input → the label matches the real hand (verified on real photos).
      handedness: [[{ categoryName: spec.user === 'left' ? 'Left' : 'Right', score: 0.98 }]],
    },
  };
}

const FIST = { index: 'folded', middle: 'folded', ring: 'folded', pinky: 'folded' };

/** Canonical pose for each sign in the vocabulary. */
export const POSES = {
  hello: { thumb: 'out', splay: { index: 8, ring: -6, pinky: -14 } },
  my_name_is: { fingers: { ring: 'folded', pinky: 'folded' }, thumb: 'tucked', rotate: -90 },
  thank_you: { thumb: 'alongside' },
  yes: { fingers: FIST, thumb: 'side', rotate: -90 },
  no: { fingers: FIST, thumb: 'side', rotate: 90 },
  help: { fingers: FIST, thumb: 'tucked' },
  i_love_you: { fingers: { middle: 'folded', ring: 'folded' }, thumb: 'out', splay: { index: 6, pinky: -12 } },
  please: { fingers: { index: 'ok' }, thumb: 'touchIndex', splay: { ring: -4, pinky: -10 } },
  sorry: { fingers: FIST, thumb: 'tucked' },
  stop: { thumb: 'alongside' },
  pain: { fingers: { index: 'bent', middle: 'bent', ring: 'bent', pinky: 'bent' }, thumb: 'out', splay: { index: 8, pinky: -10 } },
  eat: { fingers: { index: 'pinch', middle: 'pinch', ring: 'pinch', pinky: 'pinch' }, thumb: 'pinch' },
  drink: { fingers: { index: 'folded', middle: 'folded', ring: 'folded' }, thumb: 'out', splay: { pinky: -14 } },
  more: { fingers: { ring: 'folded', pinky: 'folded' }, thumb: 'tucked', splay: { index: 13, middle: -9 } },
  bathroom: { fingers: { index: 'folded', middle: 'folded', ring: 'folded' }, thumb: 'tucked' },
  how: { fingers: { middle: 'folded', ring: 'folded', pinky: 'folded' }, thumb: 'tucked', rotate: -90 },
  what: { fingers: { pinky: 'folded' }, thumb: 'tucked', splay: { index: 6, ring: -6 } },
  where: { fingers: { middle: 'folded', ring: 'folded', pinky: 'folded' }, thumb: 'tucked' },
  when: { fingers: { middle: 'folded', ring: 'folded', pinky: 'folded' }, thumb: 'side' },
};
