// Developer overlay: shows the raw features our rules see. Useful to tune thresholds live
// and to demonstrate to the jury that recognition is our own rule system, not a black box.

const FINGERS = ['thumb', 'index', 'middle', 'ring', 'pinky'];

export function DebugPanel({ frame }) {
  const f = frame?.features;
  if (!f) return <div className="card debug muted">no hand</div>;
  const bar = (v) => (
    <span className="dbar">
      <span style={{ width: `${Math.round(Math.min(1, Math.max(0, v)) * 100)}%` }} />
    </span>
  );
  return (
    <div className="card debug">
      <div className="debug-grid">
        {FINGERS.map((k) => (
          <div key={k}>
            <code>{k.padEnd(6)}</code> curl {f.curl[k].toFixed(2)} {bar(f.curl[k])}
          </div>
        ))}
        <div>
          <code>palm  </code> facing {f.palmFacing.toFixed(2)} · {f.handedness} hand
        </div>
        <div>
          <code>spread</code> IM {f.spread.indexMiddle.toFixed(2)} · MR {f.spread.middleRing.toFixed(2)} · RP {f.spread.ringPinky.toFixed(2)}
        </div>
        <div>
          <code>touch </code> T–I {f.touch.thumbIndex.toFixed(2)} · T–M {f.touch.thumbMiddle.toFixed(2)}
        </div>
        <div>
          <code>size  </code> {f.handSize.toFixed(3)}
        </div>
        <div>
          <code>top   </code>{' '}
          {(frame.debug ?? []).map((d) => `${d.id} ${(d.match * 100).toFixed(0)}%${d.ok ? '✓' : ''}`).join(' · ')}
        </div>
      </div>
    </div>
  );
}
