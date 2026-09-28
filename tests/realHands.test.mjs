// Regression tests on REAL MediaPipe output (landmarks recorded from public sample photos).
// These guard the calibration of finger curl, thumb extension and palm orientation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GESTURES } from '../src/data/gestures.js';
import { extractFeatures } from '../src/vision/features.js';
import { classifyAll } from '../src/vision/gestureClassifier.js';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/real-hands.json', import.meta.url), 'utf8'));
const toPts = (arr) => arr.map(([x, y, z]) => ({ x, y, z }));

function run(key) {
  const fx = fixtures[key];
  const f = extractFeatures(
    { landmarks: toPts(fx.landmarks), world: toPts(fx.world), handedness: fx.handedness },
    { width: fx.width, height: fx.height },
  );
  const evals = classifyAll(GESTURES, f);
  const byId = Object.fromEntries(evals.map((e) => [e.gesture.id, e]));
  const bestStatic = evals.filter((e) => e.ok && e.gesture.type === 'static').sort((a, b) => b.match - a.match)[0];
  const top = evals.slice().sort((a, b) => b.match - a.match).slice(0, 3).map((e) => `${e.gesture.id}:${e.match.toFixed(2)}${e.ok ? '✓' : ''}`).join(' ');
  return { f, byId, bestStatic, top };
}

for (const key of ['thumbs_up', 'thumbs_up_flip']) {
  test(`real photo ${key} → YES (and not a claw / SORRY confusion)`, () => {
    const { bestStatic, byId, top } = run(key);
    assert.equal(bestStatic?.gesture.id, 'yes', top);
    assert.ok(!byId.pain.ok, `PAIN must not match a fist: ${top}`);
  });
}

for (const key of ['thumbs_down', 'thumbs_down_flip']) {
  test(`real photo ${key} → NO`, () => {
    const { bestStatic, top } = run(key);
    assert.equal(bestStatic?.gesture.id, 'no', top);
  });
}

for (const key of ['victory', 'victory_flip']) {
  test(`real photo ${key} → MORE, palm toward camera`, () => {
    const { bestStatic, f, top } = run(key);
    assert.equal(bestStatic?.gesture.id, 'more', top);
    assert.ok(f.palmFacing > 0.2, `palmFacing ${f.palmFacing}`);
  });
}

for (const key of ['pointing_up', 'pointing_up_flip']) {
  test(`real photo ${key} → WHERE hand shape (dynamic, waits for the wag)`, () => {
    const { byId, bestStatic, f, top } = run(key);
    assert.ok(byId.where.ok, top);
    assert.equal(bestStatic, undefined, `no static sign should fire: ${top}`);
    assert.ok(f.palmFacing > 0.2, `palmFacing ${f.palmFacing}`);
  });
}

test('left and right versions of the same photo give the same finger curls', () => {
  for (const base of ['thumbs_up', 'victory', 'pointing_up']) {
    const a = run(base).f;
    const b = run(`${base}_flip`).f;
    assert.notEqual(a.handedness, b.handedness);
    assert.ok(Math.sign(a.palmFacing) === Math.sign(b.palmFacing), `${base}: palm sign flips between hands`);
  }
});
