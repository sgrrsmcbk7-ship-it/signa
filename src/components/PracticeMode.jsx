import { memo } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { GESTURES, GESTURE_BY_ID } from '../data/gestures.js';
import { HandGlyph } from './HandGlyph.jsx';

export function PracticeTarget({ targetId, success, marks, onNext }) {
  const { t, phrase, howTo } = useI18n();
  const g = GESTURE_BY_ID[targetId];
  if (!g) return null;
  return (
    <div className={`card practice-target ${success ? 'success' : ''}`}>
      <div className="pt-glyph">
        <HandGlyph gesture={g} size={128} marks={success ? null : marks} />
        <span className={`type-tag ${g.type}`}>{g.type === 'dynamic' ? `↻ ${t('practice.move')}` : `✋ ${t('practice.hold')}`}</span>
      </div>
      <div className="pt-body">
        <span className="kicker">{t('practice.try')}</span>
        <h2 className="pt-word">{phrase(g)}</h2>
        <p className="pt-how">
          <b>{t('practice.how')}:</b> {howTo(g)}
        </p>
        {success ? (
          <div className="perfect" role="status">
            <span>✓ {t('practice.perfect')}</span>
            <small className="muted">{t('practice.auto')}</small>
          </div>
        ) : null}
        <button className="btn btn-soft" onClick={onNext}>
          {t('practice.next')} →
        </button>
      </div>
    </div>
  );
}

function PracticeGridBase({ targetId, learned, onPick, onReset }) {
  const { t, phrase } = useI18n();
  const n = GESTURES.filter((g) => learned[g.id]).length;
  return (
    <div className="card practice-grid">
      <div className="card-head">
        <h3>{t('practice.progress', { n, total: GESTURES.length })}</h3>
        {n > 0 && (
          <button className="link-btn" onClick={onReset}>
            {t('practice.reset')}
          </button>
        )}
      </div>
      <div className="progress big">
        <span style={{ width: `${(n / GESTURES.length) * 100}%` }} />
      </div>
      <div className="sign-grid">
        {GESTURES.map((g) => (
          <button
            key={g.id}
            className={`sign-tile ${g.id === targetId ? 'active' : ''} ${learned[g.id] ? 'learned' : ''}`}
            onClick={() => onPick(g.id)}
            aria-pressed={g.id === targetId}
          >
            <HandGlyph gesture={g} size={44} />
            <span>{phrase(g)}</span>
            {learned[g.id] && <i className="tick">✓</i>}
          </button>
        ))}
      </div>
    </div>
  );
}

export const PracticeGrid = memo(PracticeGridBase);
