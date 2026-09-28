// Procedural hand icon generated from a sign's declarative shape (src/data/gestures.js).
// Adding a new sign automatically gives it an icon — no image assets needed.
import { memo } from 'react';

const FINGERS = {
  index: { x: 36, len: 30 },
  middle: { x: 46, len: 34 },
  ring: { x: 56, len: 31 },
  pinky: { x: 65, len: 24 },
};
const BASE_Y = 52;
const THUMB_BASE = { x: 31, y: 74 };

function fingerPath(name, state, angle) {
  const { x, len } = FINGERS[name];
  const rad = (angle * Math.PI) / 180;
  const at = (l) => ({ x: x + Math.sin(rad) * l, y: BASE_Y - Math.cos(rad) * l });
  if (state === 'folded') return { d: `M${x},${BASE_Y} L${at(5).x},${at(5).y}`, tip: at(5), folded: true };
  if (state === 'bent' || state === 'notExtended') {
    const k = at(len * 0.52);
    const hook = { x: k.x + 1, y: k.y + 7 };
    return { d: `M${x},${BASE_Y} L${k.x},${k.y} Q${k.x + 1},${k.y - 5} ${hook.x},${hook.y}`, tip: k, bent: true };
  }
  const tip = at(len);
  return { d: `M${x},${BASE_Y} L${tip.x},${tip.y}`, tip };
}

function HandGlyphBase({ gesture, size = 96, marks = null, className = '' }) {
  const shape = gesture?.shape ?? {};
  const f = { index: 'extended', middle: 'extended', ring: 'extended', pinky: 'extended', ...shape.fingers };
  for (const k of Object.keys(FINGERS)) if (!f[k] || f[k] === 'any' || f[k] === 'notFolded') f[k] = 'extended';

  const apart = shape.spread?.indexMiddle === 'apart';
  const openSpread = gesture?.id === 'hello' || gesture?.id === 'pain';
  const angles = {
    index: apart ? -14 : openSpread ? -9 : 0,
    middle: apart ? 8 : 0,
    ring: openSpread ? 5 : 0,
    pinky: openSpread ? 12 : f.pinky === 'extended' && f.ring !== 'extended' ? 8 : 0,
  };

  const pinch = shape.touch?.thumbIndex && shape.touch?.thumbMiddle;
  const okSign = shape.touch?.thumbIndex && !pinch;
  const paths = {};
  for (const name of Object.keys(FINGERS)) {
    if (pinch) {
      const { x } = FINGERS[name];
      paths[name] = { d: `M${x},${BASE_Y} Q${x},${BASE_Y - 16} 44,${BASE_Y - 20}`, tip: { x: 44, y: BASE_Y - 20 }, bent: true };
    } else paths[name] = fingerPath(name, okSign && name === 'index' ? 'bent' : f[name], angles[name]);
  }

  // Thumb
  const thumbState = shape.fingers?.thumb;
  const thumbDir = shape.pointing?.thumb;
  let thumbEnd;
  let rotate = 0;
  if (pinch) thumbEnd = { x: 42, y: BASE_Y - 18 };
  else if (okSign) thumbEnd = { x: paths.index.tip.x - 1, y: paths.index.tip.y + 6 };
  else if (thumbDir === 'up' || thumbDir === 'down') {
    thumbEnd = { x: 26, y: 38 };
    if (thumbDir === 'down') rotate = 180;
  } else if (thumbDir === 'side') thumbEnd = { x: 9, y: 66 };
  else if (thumbState === 'extended') thumbEnd = { x: 13, y: 54 };
  else if (thumbState === 'folded') thumbEnd = { x: 53, y: 68 };
  else thumbEnd = { x: 29, y: 56 };
  if (shape.pointing?.index === 'side' || shape.handDir === 'side') rotate = -90;

  const color = (name) =>
    marks?.[name] === 'bad' ? 'var(--err)' : marks?.[name] === 'good' ? 'var(--ok)' : 'var(--glyph)';
  const motion = gesture?.motion?.type;

  // 🤌 EAT: all fingertips gathered onto the thumb — each finger outlined so they stay distinct.
  if (pinch) {
    const tip = { x: 50, y: 17 };
    const fingers = [
      ['index', 'M37,56 C31,40 38,24 48,18'],
      ['middle', 'M46,53 C43,38 45,25 49,17'],
      ['ring', 'M55,54 C57,39 55,26 51,18'],
      ['pinky', 'M63,58 C68,44 62,28 53,20'],
    ];
    const stroke = (d, name, w) => (
      <g key={name}>
        <path d={d} stroke="var(--bg-2)" strokeWidth={w + 3} />
        <path d={d} stroke={color(name)} strokeWidth={w} />
      </g>
    );
    return (
      <svg
        className={`hand-glyph ${className}`}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={gesture?.phrase?.en ?? 'hand'}
      >
        <g strokeLinecap="round" fill="none">
          <rect x="36" y="86" width="28" height="11" rx="5" fill="var(--glyph)" opacity="0.7" />
          <rect x="31" y="50" width="38" height="40" rx="13" fill="var(--glyph)" />
          {fingers.map(([name, d]) => stroke(d, name, name === 'pinky' ? 7 : 8))}
          {stroke('M33,78 C20,62 30,34 46,22', 'thumb', 10.5)}
          <circle cx={tip.x} cy={tip.y + 1} r="7.5" stroke="var(--accent)" strokeWidth="2.2" />
        </g>
      </svg>
    );
  }

  // 👍 / 👎: a fist seen from the side with a big thumb — the generic front view is ambiguous.
  if (thumbDir === 'up' || thumbDir === 'down') {
    return (
      <svg
        className={`hand-glyph ${className}`}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={gesture?.phrase?.en ?? 'hand'}
      >
        <g transform={`rotate(${thumbDir === 'down' ? 180 : 0} 50 55)`} strokeLinecap="round">
          <rect x="30" y="86" width="26" height="11" rx="5" fill="var(--glyph)" opacity="0.7" />
          <rect x="22" y="40" width="44" height="50" rx="15" fill="var(--glyph)" />
          {['index', 'middle', 'ring', 'pinky'].map((name, i) => (
            <rect
              key={name}
              x="44"
              y={41 + i * 12}
              width={i === 3 ? 30 : 36}
              height="11.5"
              rx="5.7"
              fill={color(name)}
              stroke="var(--bg-2)"
              strokeWidth="1.8"
            />
          ))}
          <path d="M34,48 Q32,30 36,16" stroke={color('thumb')} strokeWidth="19" />
          <ellipse cx="37.5" cy="15" rx="4.6" ry="4" fill="var(--glyph-nail)" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      className={`hand-glyph ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label={gesture?.phrase?.en ?? 'hand'}
    >
      <g transform={`rotate(${rotate} 50 62)`} strokeLinecap="round" fill="none">
        <rect x="29" y="48" width="42" height="38" rx="12" fill="var(--glyph)" />
        <rect x="36" y="84" width="28" height="12" rx="5" fill="var(--glyph)" opacity="0.7" />
        {Object.entries(paths).map(([name, p]) => (
          <path
            key={name}
            d={p.d}
            stroke={color(name)}
            strokeWidth="8.5"
            opacity={p.folded ? 0.55 : 1}
          />
        ))}
        {Object.entries(paths)
          .filter(([, p]) => !p.folded && !p.bent)
          .map(([name, p]) => (
            <circle key={name} cx={p.tip.x} cy={p.tip.y} r="2" fill="var(--glyph-nail)" />
          ))}
        <path
          d={`M${THUMB_BASE.x},${THUMB_BASE.y} Q${(THUMB_BASE.x + thumbEnd.x) / 2 - 3},${(THUMB_BASE.y + thumbEnd.y) / 2 + 2} ${thumbEnd.x},${thumbEnd.y}`}
          stroke={color('thumb')}
          strokeWidth="11.5"
        />
        {thumbState === 'extended' && !okSign && !pinch && (
          <circle cx={thumbEnd.x} cy={thumbEnd.y} r="2.4" fill="var(--glyph-nail)" />
        )}
        {(okSign || pinch) && <circle cx={thumbEnd.x + 1} cy={thumbEnd.y - 2} r="5" stroke="var(--accent)" strokeWidth="2" />}
      </g>
      {motion === 'wave' && (
        <g stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M14,14 Q50,2 86,14" />
          <path d="M14,14 l3,-6 M14,14 l6,3 M86,14 l-3,-6 M86,14 l-6,3" />
        </g>
      )}
      {motion === 'wag' && (
        <g stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M24,10 Q36,4 48,10" />
          <path d="M24,10 l3,-5 M24,10 l6,2 M48,10 l-3,-5 M48,10 l-6,2" />
        </g>
      )}
      {motion === 'down' && (
        <g stroke="var(--accent)" strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M88,18 L88,70 M80,61 L88,71 L96,61" />
        </g>
      )}
      {motion === 'circle' && (
        <g stroke="var(--accent)" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M84,26 A14,14 0 1 1 70,12" />
          <path d="M70,12 l7,-4 M70,12 l6,5" />
        </g>
      )}
    </svg>
  );
}

export const HandGlyph = memo(HandGlyphBase);
