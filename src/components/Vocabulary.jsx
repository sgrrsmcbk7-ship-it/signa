import { useEffect } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { GESTURES } from '../data/gestures.js';
import { HandGlyph } from './HandGlyph.jsx';

export function Vocabulary({ open, onClose, onPractice }) {
  const { t, phrase, howTo } = useI18n();
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-label={t('vocab.title')}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="modal">
        <div className="card-head">
          <h2>
            {t('vocab.title')} <span className="muted">· {GESTURES.length}</span>
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('vocab.close')}>
            ✕
          </button>
        </div>
        <div className="vocab-grid">
          {GESTURES.map((g) => (
            <button key={g.id} className="vocab-item" onClick={() => onPractice(g.id)}>
              <HandGlyph gesture={g} size={64} />
              <div>
                <div className="vocab-word">
                  {phrase(g)}
                  <span className={`type-tag ${g.type}`}>{g.type === 'dynamic' ? `↻ ${t('vocab.dynamic')}` : `✋ ${t('vocab.static')}`}</span>
                </div>
                <p className="muted">{howTo(g)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
