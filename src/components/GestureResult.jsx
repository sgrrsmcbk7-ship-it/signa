import { useI18n } from '../i18n/index.jsx';
import { GESTURE_BY_ID } from '../data/gestures.js';
import { HandGlyph } from './HandGlyph.jsx';

export function GestureResult({ last, onRepeat, speaking }) {
  const { t, phrase, speech } = useI18n();
  const g = last ? GESTURE_BY_ID[last.gestureId] : null;

  if (!g) {
    return (
      <div className="card result idle">
        <div className="result-empty">
          <div className="pulse-hand" aria-hidden>
            <HandGlyph gesture={GESTURE_BY_ID.hello} size={72} />
          </div>
          <div>
            <h2>{t('live.idle')}</h2>
            <p className="muted">{t('live.idleSub')}</p>
          </div>
        </div>
      </div>
    );
  }

  const pct = Math.round(last.match * 100);
  return (
    <div className="card result" aria-live="assertive">
      <div className="result-main" key={last.at}>
        <HandGlyph gesture={g} size={76} />
        <div className="result-text">
          <div className="result-word">{phrase(g)}</div>
          <div className={`result-speech ${speaking ? 'speaking' : ''}`}>
            <span className="eq" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            “{speech(g)}”
          </div>
        </div>
      </div>
      <div className="result-foot">
        <div className="meter" title={t('live.match')}>
          <span className="meter-label">
            {t('live.match')} <b>{pct}%</b>
          </span>
          <span className="meter-bar">
            <span style={{ width: `${pct}%` }} />
          </span>
        </div>
        <button className="btn btn-soft" onClick={onRepeat}>
          🔊 {t('live.repeat')}
        </button>
      </div>
    </div>
  );
}
