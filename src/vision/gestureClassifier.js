// Stage 3: rule-based classifier. For every sign in the vocabulary we evaluate its rules and
// combine them into a "match" score (weighted mean). A sign is accepted only if the match is
// high enough AND no single rule is clearly violated — one wrong finger must not be averaged away.

import { evaluateShape } from './gestureRules.js';
import { ENGINE } from '../config.js';

/**
 * @returns {{gesture, match:number, minScore:number, ok:boolean, rules:Array}}
 */
export function evaluateGesture(gesture, features, opts = {}) {
  const rules = evaluateShape(gesture.shape, features);
  let sw = 0;
  let s = 0;
  let minScore = 1;
  for (const r of rules) {
    sw += r.weight;
    s += r.weight * r.score;
    if (r.score < minScore) minScore = r.score;
  }
  const match = sw ? s / sw : 0;
  const threshold = (opts.matchThreshold ?? ENGINE.matchThreshold);
  return {
    gesture,
    match,
    minScore,
    ok: match >= threshold && minScore >= (opts.minConstraint ?? ENGINE.minConstraint),
    rules,
  };
}

export function classifyAll(gestures, features, opts) {
  return gestures.map((g) => evaluateGesture(g, features, opts));
}

/** Failing rules ordered by what the user should fix first. */
export function failingRules(evaluation, limit = 3) {
  return evaluation.rules
    .filter((r) => r.score < 0.75)
    .sort((a, b) => a.priority - b.priority || a.score - b.score)
    .slice(0, limit);
}

export function bestOf(evals, predicate = () => true) {
  let best = null;
  for (const e of evals) if (predicate(e) && (!best || e.match > best.match)) best = e;
  return best;
}
