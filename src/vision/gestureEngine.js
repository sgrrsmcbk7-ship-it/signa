// Stage 4: temporal validation + Error Mode orchestration.
//
//  per frame:  features → framing check → classify all signs → history buffer
//                 │                                              │
//                 │                ┌─────────────────────────────┤
//                 ▼                ▼                             ▼
//            blocking issue   static sign: must stay        dynamic sign: shape held
//            (Error Mode L1)  "ok" + still for holdMs       while motion pattern completes
//                                  │                             │
//                                  └──────────► confirm ◄────────┘
//                                          (cooldown + release)
//
//  If nothing confirms, a diagnosis is produced (Error Mode L2/L3): which sign the user is
//  most likely attempting and the highest-priority concrete fix.

import { ENGINE, SENSITIVITY } from '../config.js';
import { extractFeatures } from './features.js';
import { classifyAll, failingRules, bestOf } from './gestureClassifier.js';
import { detectMotion } from './motion.js';
import { checkFraming } from './gestureValidation.js';
import { PRIORITY } from './gestureRules.js';

const median = (arr) => {
  if (!arr.length) return 1;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

/** Palm drift (in palm lengths) over frames newer than `sinceT`. */
function driftSince(history, sinceT) {
  const frames = history.filter((f) => f.t >= sinceT);
  if (frames.length < 2) return 0;
  const size = median(frames.map((f) => f.size));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const f of frames) {
    minX = Math.min(minX, f.palm.x); maxX = Math.max(maxX, f.palm.x);
    minY = Math.min(minY, f.palm.y); maxY = Math.max(maxY, f.palm.y);
  }
  return Math.max(maxX - minX, maxY - minY) / size;
}

/** Most recent contiguous run of frames where the dynamic sign's shape was held (small gaps allowed). */
function trailingShapeFrames(history, id, maxGap = 3) {
  const out = [];
  let gap = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].shape[id]) {
      out.push(history[i]);
      gap = 0;
    } else if (++gap > maxGap) break;
  }
  return out.reverse();
}

function fingerMarks(evaluation, failing) {
  const marks = {};
  for (const r of evaluation.rules) {
    if (r.kind === 'finger') marks[r.fingers[0]] = r.score >= 0.75 ? 'good' : 'bad';
  }
  for (const r of failing) for (const f of r.fingers) marks[f] = 'bad';
  return marks;
}

const ruleToIssue = (r) => ({ ...r.hint, priority: r.priority, score: r.score });

export class GestureEngine {
  constructor(gestures, options = {}) {
    this.gestures = gestures;
    this.byId = Object.fromEntries(gestures.map((g) => [g.id, g]));
    this.cfg = { ...ENGINE };
    this.opts = { mode: 'live', targetId: null, sensitivity: 'normal', invertPalm: false };
    this.onConfirm = null;
    this.reset();
    this.configure(options);
  }

  configure(partial = {}) {
    const modeChanged =
      (partial.mode && partial.mode !== this.opts.mode) ||
      (partial.targetId !== undefined && partial.targetId !== this.opts.targetId);
    Object.assign(this.opts, partial);
    if (modeChanged) this.softReset();
  }

  reset() {
    this.softReset();
    this.cooldownUntil = 0;
    this.last = null;
    this.flash = null;
  }

  softReset() {
    this.history = [];
    this.hold = null;
    this.noHandSince = null;
    this.shown = null;
    this.pending = null;
    this.lastDiagAt = 0;
  }

  get sens() {
    return SENSITIVITY[this.opts.sensitivity] ?? SENSITIVITY.normal;
  }

  /**
   * @param result MediaPipe HandLandmarkerResult
   * @param frame {width,height} of the video
   * @param now performance.now()
   */
  process(result, frame, now) {
    const cfg = this.cfg;
    const lms = result?.landmarks ?? [];
    const flash = this.flash && now < this.flash.until ? this.flash : null;

    // ── No hand ──────────────────────────────────────────────────────────────
    if (!lms.length) {
      this.history.length = 0;
      this.hold = null;
      this.shown = null;
      this.pending = null;
      if (this.last) this.last.released = true;
      this.noHandSince ??= now;
      const issues = now - this.noHandSince > cfg.noHandHintMs ? [{ key: 'noHand', priority: PRIORITY.framing }] : [];
      return { status: flash ? 'confirmed' : 'searching', handCount: 0, issues, flash, diag: null };
    }
    this.noHandSince = null;

    // Primary hand = the biggest one on screen.
    let idx = 0;
    let bestArea = -1;
    lms.forEach((hand, i) => {
      const xs = hand.map((p) => p.x);
      const ys = hand.map((p) => p.y);
      const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys));
      if (area > bestArea) { bestArea = area; idx = i; }
    });
    const handednessList = result.handedness ?? result.handednesses ?? [];
    const hand = {
      landmarks: lms[idx],
      world: result.worldLandmarks?.[idx],
      handedness: handednessList[idx]?.[0]?.categoryName,
    };
    const f = extractFeatures(hand, frame, { invertPalm: this.opts.invertPalm });
    this.lastFeatures = f;
    const base = { handCount: lms.length, landmarks: lms, primary: idx, features: f, flash };

    // ── Error Mode level 1: framing ──────────────────────────────────────────
    const framing = checkFraming(f, lms.length, cfg);
    if (framing.length) {
      this.hold = null;
      this.history.length = 0;
      return { ...base, status: flash ? 'confirmed' : 'blocked', issues: framing, diag: null };
    }

    // ── Classification ───────────────────────────────────────────────────────
    const evals = classifyAll(this.gestures, f, { matchThreshold: cfg.matchThreshold + this.sens.match });
    const byId = Object.fromEntries(evals.map((e) => [e.gesture.id, e]));
    const practice = this.opts.mode === 'practice' && this.opts.targetId && byId[this.opts.targetId];
    const targetId = practice ? this.opts.targetId : null;
    const eligible = (id) => !practice || id === targetId;

    // ── History (for motion + stability) ─────────────────────────────────────
    const rec = { t: now, palm: f.palmCenter, tip: f.indexTip, size: f.palmPx, normY: f.normY, shape: {} };
    for (const e of evals) {
      if (e.gesture.type === 'dynamic') {
        rec.shape[e.gesture.id] = e.match >= cfg.dynamicShapeMin && e.minScore >= 0.35;
      }
    }
    this.history.push(rec);
    while (this.history.length && now - this.history[0].t > cfg.historyMs) this.history.shift();

    // ── Release: the last word can repeat only after the hand stopped showing it ─
    if (this.last && !this.last.released) {
      const g = this.byId[this.last.id];
      const showing = g.type === 'dynamic' ? rec.shape[g.id] : byId[g.id]?.ok;
      if (!showing) {
        this.last.diffSince ??= now;
        if (now - this.last.diffSince >= cfg.releaseMs) this.last.released = true;
      } else this.last.diffSince = null;
    }
    const canFire = (id) => now >= this.cooldownUntil && !(this.last && this.last.id === id && !this.last.released);

    // ── Dynamic signs ────────────────────────────────────────────────────────
    let motion = null;
    for (const e of evals) {
      const g = e.gesture;
      if (g.type !== 'dynamic' || !eligible(g.id) || !rec.shape[g.id]) continue;
      const m = detectMotion(g.motion, trailingShapeFrames(this.history, g.id));
      if (m.done && canFire(g.id)) return this.confirm(e, now, base);
      if (!motion || m.progress > motion.progress) motion = { eval: e, ...m };
    }

    // ── Static signs: hold + stability ───────────────────────────────────────
    let hold = null;
    const staticBest = bestOf(evals, (e) => e.ok && e.gesture.type === 'static' && eligible(e.gesture.id));
    if (staticBest) {
      const id = staticBest.gesture.id;
      if (!this.hold || this.hold.id !== id) this.hold = { id, since: now };
      let moving = false;
      if (driftSince(this.history, this.hold.since) > cfg.stableRange) {
        this.hold.since = now;
        moving = true;
      }
      const need = (staticBest.gesture.holdMs ?? cfg.holdMs) * this.sens.hold;
      const progress = Math.min(1, (now - this.hold.since) / need);
      if (progress >= 1 && canFire(id)) return this.confirm(staticBest, now, base);
      hold = {
        eval: staticBest,
        progress,
        moving,
        remainingMs: need * (1 - progress),
        blocked: progress >= 1 ? (now < this.cooldownUntil ? 'cooldown' : 'repeat') : null,
      };
    } else this.hold = null;

    // ── Error Mode levels 2–3: diagnosis ─────────────────────────────────────
    const handStill =
      this.history.length > 3 &&
      now - this.history[0].t >= cfg.handStillMs &&
      driftSince(this.history, now - cfg.handStillMs) < cfg.stableRange;

    let diag = null;
    if (practice) {
      const e = byId[targetId];
      if (e.gesture.type === 'static') diag = hold ? this.holdDiag(hold) : this.shapeDiag(e, evals, true);
      else diag = motion ? this.motionDiag(motion) : this.shapeDiag(e, evals, true);
    } else if (motion && motion.progress >= 0.2) diag = this.motionDiag(motion);
    else if (hold) diag = this.holdDiag(hold);
    else if (motion) diag = this.motionDiag(motion, evals);
    else if (handStill) {
      const nm = bestOf(evals, (e) => !e.ok);
      diag = nm && nm.match >= cfg.nearMissThreshold + this.sens.match
        ? this.shapeDiag(nm, evals, false)
        : { kind: 'unknown', gestureId: nm?.gesture.id ?? null, match: nm?.match ?? 0, issues: [{ key: 'unknownShape' }] };
    }
    diag = this.stabilize(diag, now);

    let status = 'detected';
    if (flash) status = 'confirmed';
    else if (diag?.kind === 'hold') status = 'holding';
    else if (diag?.kind === 'motion') status = 'motion';
    else if (diag?.kind === 'shape') status = 'almost';

    return {
      ...base,
      status,
      issues: [],
      diag,
      debug: evals
        .map((e) => ({ id: e.gesture.id, match: e.match, ok: e.ok }))
        .sort((a, b) => b.match - a.match)
        .slice(0, 4),
    };
  }

  confirm(evaluation, now, base) {
    const id = evaluation.gesture.id;
    this.cooldownUntil = now + this.cfg.cooldownMs;
    this.last = { id, released: false, diffSince: null };
    this.hold = null;
    this.history.length = 0;
    this.shown = null;
    this.pending = null;
    this.flash = { gestureId: id, match: evaluation.match, until: now + this.cfg.confirmFlashMs };
    const event = { gestureId: id, match: evaluation.match, at: Date.now() };
    this.onConfirm?.(event);
    return { ...base, flash: this.flash, status: 'confirmed', issues: [], diag: null, event };
  }

  holdDiag(hold) {
    const e = hold.eval;
    let issue;
    if (hold.moving) issue = { key: 'holdStill', priority: PRIORITY.hold };
    else if (hold.blocked === 'repeat') issue = { key: 'changeToRepeat', priority: PRIORITY.hold };
    else if (hold.blocked === 'cooldown') issue = { key: 'wait', priority: PRIORITY.hold };
    else issue = { key: 'keepHolding', priority: PRIORITY.hold, sec: Math.max(0.1, hold.remainingMs / 1000).toFixed(1) };
    return {
      kind: 'hold',
      gestureId: e.gesture.id,
      match: e.match,
      progress: hold.progress,
      issues: [issue],
      fingerMarks: fingerMarks(e, []),
    };
  }

  motionDiag(motion, evals) {
    const e = motion.eval;
    const type = e.gesture.motion.type;
    const alternatives = [];
    if (evals) {
      // Live mode: the same hand shape may also mean something else — tell the user both options.
      for (const other of evals) {
        if (other === e || other.gesture.type !== 'dynamic') continue;
        if (other.match >= this.cfg.dynamicShapeMin && other.minScore >= 0.35) {
          alternatives.push({ gestureId: other.gesture.id, key: 'motion', type: other.gesture.motion.type, issue: 'start' });
        }
      }
      const st = bestOf(evals, (x) => x.gesture.type === 'static' && !x.ok && x.match >= 0.7);
      if (st) {
        const r = failingRules(st, 1)[0];
        if (r) alternatives.push({ gestureId: st.gesture.id, ...r.hint });
      }
    }
    return {
      kind: 'motion',
      gestureId: e.gesture.id,
      match: e.match,
      progress: motion.progress,
      issues: [{ key: 'motion', type, issue: motion.issue ?? 'continue', priority: PRIORITY.motion }],
      alternatives: alternatives.slice(0, 2),
      fingerMarks: fingerMarks(e, []),
    };
  }

  shapeDiag(e, evals, practice) {
    let failing = failingRules(e, 2);
    if (!failing.length) failing = [...e.rules].sort((a, b) => a.score - b.score).slice(0, 1);
    const looksLike = practice ? bestOf(evals, (x) => x.ok && x.gesture.id !== e.gesture.id)?.gesture.id ?? null : null;
    return {
      kind: 'shape',
      gestureId: e.gesture.id,
      match: e.match,
      issues: failing.map(ruleToIssue),
      looksLike,
      fingerMarks: fingerMarks(e, failing),
    };
  }

  /** Debounces coaching so hints don't flicker between frames. */
  stabilize(diag, now) {
    const cfg = this.cfg;
    if (!diag) {
      if (this.shown && now - this.lastDiagAt > cfg.diagClearMs) this.shown = null;
      return this.shown;
    }
    this.lastDiagAt = now;
    if (diag.kind === 'hold' || diag.kind === 'motion') {
      this.pending = null;
      this.shown = diag;
      return diag;
    }
    const top = diag.issues[0] ?? {};
    const sig = `${diag.kind}|${diag.gestureId}|${top.key}|${top.finger ?? ''}`;
    if (this.shown?.sig === sig) {
      this.shown = { ...diag, sig };
      return this.shown;
    }
    if (!this.pending || this.pending.sig !== sig) this.pending = { sig, since: now };
    if (!this.shown || this.shown.kind === 'hold' || this.shown.kind === 'motion' || now - this.pending.since >= cfg.diagDebounceMs) {
      this.shown = { ...diag, sig };
      this.pending = null;
    }
    return this.shown;
  }
}
