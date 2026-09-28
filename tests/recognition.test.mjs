import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHand, POSES } from './syntheticHand.mjs';
import { GESTURES } from '../src/data/gestures.js';
import { extractFeatures } from '../src/vision/features.js';
import { classifyAll, failingRules } from '../src/vision/gestureClassifier.js';
import { GestureEngine } from '../src/vision/gestureEngine.js';

const byId = Object.fromEntries(GESTURES.map((g) => [g.id, g]));

function classify(spec) {
  const { result, frame } = makeHand(spec);
  const hand = {
    landmarks: result.landmarks[0],
    world: result.worldLandmarks[0],
    handedness: result.handedness[0][0].categoryName,
  };
  const f = extractFeatures(hand, frame);
  return { f, evals: classifyAll(GESTURES, f) };
}

const describe = (evals) =>
  evals
    .slice()
    .sort((a, b) => b.match - a.match)
    .slice(0, 3)
    .map((e) => `${e.gesture.id}:${e.match.toFixed(2)}${e.ok ? '✓' : ''}`)
    .join(' ');

test('vocabulary has 19 signs with unique ids and 3 languages', () => {
  assert.equal(GESTURES.length, 19);
  assert.equal(new Set(GESTURES.map((g) => g.id)).size, 19);
  for (const g of GESTURES) {
    for (const l of ['en', 'ru', 'kk']) {
      assert.ok(g.phrase[l] && g.speech[l] && g.howTo[l], `${g.id} missing ${l}`);
    }
    if (g.type === 'dynamic') assert.ok(g.motion, `${g.id} needs motion`);
  }
});

test('feature sanity: straight vs folded fingers', () => {
  const open = classify(POSES.hello).f;
  const fist = classify(POSES.help).f;
  for (const k of ['index', 'middle', 'ring', 'pinky']) {
    assert.ok(open.curl[k] < 0.2, `open ${k} curl ${open.curl[k]}`);
    assert.ok(fist.curl[k] > 0.75, `fist ${k} curl ${fist.curl[k]}`);
  }
  assert.ok(open.curl.thumb < 0.3, `open thumb curl ${open.curl.thumb}`);
  assert.ok(fist.curl.thumb > 0.6, `fist thumb curl ${fist.curl.thumb}`);
  assert.ok(open.palmFacing > 0.2, `palm facing ${open.palmFacing}`);
});

for (const g of GESTURES) {
  test(`static shape of "${g.id}" is recognized and wins`, () => {
    const { evals } = classify(POSES[g.id]);
    const mine = evals.find((e) => e.gesture.id === g.id);
    assert.ok(mine.ok, `${g.id} not ok — ${describe(evals)} | failing: ${failingRules(mine).map((r) => `${r.id}=${r.score.toFixed(2)}`).join(', ')}`);
    if (g.type === 'static') {
      const staticOk = evals.filter((e) => e.ok && e.gesture.type === 'static');
      const best = staticOk.sort((a, b) => b.match - a.match)[0];
      assert.equal(best.gesture.id, g.id, `ambiguous: ${describe(evals)}`);
    }
  });
}

test('palm orientation works for the left hand too', () => {
  const { evals } = classify({ ...POSES.stop, user: 'left' });
  assert.ok(evals.find((e) => e.gesture.id === 'stop').ok);
});

// ── Error Mode: a wrong sign must produce the RIGHT concrete hint ────────────
const hintCases = [
  ['more', { ...POSES.more, fingers: { ring: 'straight', pinky: 'folded' } }, 'fold', 'ring'],
  ['more', { ...POSES.more, splay: {} }, 'apart', 'index'],
  ['stop', { ...POSES.stop, palm: 'away' }, 'palmToCamera'],
  ['stop', POSES.hello, 'together'],
  ['yes', { ...POSES.yes, thumb: 'tucked' }, 'thumbOut'],
  ['yes', { ...POSES.yes, rotate: 0 }, 'thumb_up'],
  ['i_love_you', { ...POSES.i_love_you, fingers: { middle: 'straight', ring: 'folded' } }, 'fold', 'middle'],
  ['please', { ...POSES.please, thumb: 'out' }, 'touch'],
  ['bathroom', POSES.drink, 'thumbIn'],
  ['my_name_is', { ...POSES.my_name_is, rotate: 0 }, 'point_side'],
];
for (const [id, spec, key, finger] of hintCases) {
  test(`Error Mode: ${id} → ${key}${finger ? `(${finger})` : ''}`, () => {
    const { evals } = classify(spec);
    const e = evals.find((x) => x.gesture.id === id);
    assert.ok(!e.ok, `${id} should NOT be accepted`);
    const hints = failingRules(e, 3).map((r) => r.hint);
    assert.ok(
      hints.some((h) => h.key === key && (!finger || h.finger === finger)),
      `expected ${key} in ${JSON.stringify(hints)}`,
    );
  });
}

// ── Temporal engine ──────────────────────────────────────────────────────────
function run(engine, frames) {
  const events = [];
  engine.onConfirm = (ev) => events.push(ev.gestureId);
  let last;
  for (const { spec, t } of frames) {
    const { result, frame } = makeHand(spec);
    last = engine.process(result, frame, t);
  }
  return { events, last };
}

const seq = (ms, fn, fps = 30) => Array.from({ length: Math.round((ms / 1000) * fps) }, (_, i) => fn(i, (i * 1000) / fps));

test('static sign needs to be held (temporal validation) and fires once', () => {
  const engine = new GestureEngine(GESTURES);
  const { events: short } = run(engine, seq(300, (i, t) => ({ spec: POSES.yes, t })));
  assert.deepEqual(short, []);
  const engine2 = new GestureEngine(GESTURES);
  const { events } = run(engine2, seq(3000, (i, t) => ({ spec: POSES.yes, t })));
  assert.deepEqual(events, ['yes']); // held for 3 s → spoken once, not 20 times
});

test('dynamic: waving an open palm says HELLO', () => {
  const engine = new GestureEngine(GESTURES);
  const { events } = run(
    engine,
    seq(2000, (i, t) => ({ spec: { ...POSES.hello, offset: { x: Math.sin((t / 1000) * 2 * Math.PI * 1.5) * 70 } }, t })),
  );
  assert.deepEqual(events, ['hello']);
});

test('dynamic: flat hand moving down says THANK YOU', () => {
  const engine = new GestureEngine(GESTURES);
  const { events } = run(
    engine,
    seq(900, (i, t) => ({ spec: { ...POSES.thank_you, offset: { y: -60 + Math.min(1, t / 600) * 160 } }, t })),
  );
  assert.deepEqual(events, ['thank_you']);
});

test('dynamic: circling fist says SORRY (not HELP)', () => {
  const engine = new GestureEngine(GESTURES);
  const { events } = run(
    engine,
    seq(2000, (i, t) => {
      const a = (t / 1000) * 2 * Math.PI * 0.9;
      return { spec: { ...POSES.sorry, offset: { x: Math.cos(a) * 45, y: Math.sin(a) * 45 - 40 } }, t };
    }),
  );
  assert.deepEqual(events, ['sorry']);
});

test('dynamic: wagging index finger says WHERE', () => {
  const engine = new GestureEngine(GESTURES);
  const { events } = run(
    engine,
    seq(2000, (i, t) => ({ spec: { ...POSES.where, rotate: Math.sin((t / 1000) * 2 * Math.PI * 1.5) * 18 }, t })),
  );
  assert.deepEqual(events, ['where']);
});

test('open palm held still in live mode suggests the motion (Error Mode for dynamic signs)', () => {
  const engine = new GestureEngine(GESTURES);
  const { last, events } = run(engine, seq(1500, (i, t) => ({ spec: POSES.hello, t })));
  assert.deepEqual(events, []);
  assert.equal(last.diag?.kind, 'motion');
  assert.equal(last.diag.issues[0].type, 'wave');
});

test('practice mode coaches toward the target and reports what it looks like', () => {
  const engine = new GestureEngine(GESTURES, { mode: 'practice', targetId: 'no' });
  const { last, events } = run(engine, seq(1200, (i, t) => ({ spec: POSES.yes, t })));
  assert.deepEqual(events, []); // YES must not fire while practising NO
  assert.equal(last.diag.gestureId, 'no');
  assert.equal(last.diag.issues[0].key, 'thumb_down');
  assert.equal(last.diag.looksLike, 'yes');
});

test('framing errors: two hands, too far, out of frame', () => {
  const engine = new GestureEngine(GESTURES);
  const a = makeHand(POSES.yes);
  const b = makeHand({ ...POSES.help, offset: { x: -200 } });
  const two = engine.process(
    {
      landmarks: [a.result.landmarks[0], b.result.landmarks[0]],
      worldLandmarks: [a.result.worldLandmarks[0], b.result.worldLandmarks[0]],
      handedness: [a.result.handedness[0], b.result.handedness[0]],
    },
    a.frame,
    0,
  );
  assert.equal(two.issues[0].key, 'twoHands');
  const far = makeHand({ ...POSES.yes, size: 250 });
  assert.equal(engine.process(far.result, far.frame, 40).issues[0].key, 'tooFar');
  const cut = makeHand({ ...POSES.stop, offset: { x: 300 } });
  assert.equal(engine.process(cut.result, cut.frame, 80).issues[0].key, 'outOfFrame');
  engine.process({ landmarks: [] }, a.frame, 2000);
  assert.equal(engine.process({ landmarks: [] }, a.frame, 2100).issues.length, 0); // no nagging right away
  const none = engine.process({ landmarks: [] }, a.frame, 3000);
  assert.equal(none.issues[0].key, 'noHand');
});

test('tracking jumps are not movements (no false SORRY / THANK YOU)', () => {
  const engine = new GestureEngine(GESTURES);
  // Fist that teleports between two spots every 400 ms (e.g. hand re-detected elsewhere).
  const { events: a } = run(engine, seq(2400, (i, t) => ({ spec: { ...POSES.sorry, offset: { x: Math.floor(t / 400) % 2 ? 120 : -120 } }, t })));
  assert.ok(!a.includes('sorry'), `got ${a}`);
  const engine2 = new GestureEngine(GESTURES);
  // Open hand that jumps down once.
  const { events: b } = run(engine2, seq(1000, (i, t) => ({ spec: { ...POSES.thank_you, offset: { y: t < 500 ? -60 : 100 } }, t })));
  assert.ok(!b.includes('thank_you'), `got ${b}`);
});
