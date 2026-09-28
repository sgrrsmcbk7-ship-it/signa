// Error Mode panel: WHAT the user is trying to show, WHAT exactly is wrong, and a
// finger-by-finger checklist (green = correct, red = fix this).
import { useI18n } from '../i18n/index.jsx';
import { GESTURE_BY_ID } from '../data/gestures.js';

const FINGER_ORDER = ['thumb', 'index', 'middle', 'ring', 'pinky'];

export function ErrorFeedback({ frame, running, mode }) {
  const { t, phrase, issueText } = useI18n();
  const blocking = frame?.issues ?? [];
  const diag = frame?.diag;
  const flash = frame?.flash;

  let tone = 'idle';
  let title = t('feedback.title');
  let lines = [];
  let progress = null;
  let alternatives = [];

  if (!running) {
    lines = [];
  } else if (flash) {
    tone = 'ok';
    title = `✓ ${phrase(GESTURE_BY_ID[flash.gestureId])}`;
    lines = [t('status.confirmed')];
  } else if (blocking.length) {
    tone = 'err';
    title = t('status.blocked');
    lines = blocking.slice(0, 2).map(issueText);
  } else if (diag) {
    const word = diag.gestureId ? phrase(GESTURE_BY_ID[diag.gestureId]) : '';
    if (diag.kind === 'hold') {
      tone = 'progress';
      title = t('feedback.holding', { word });
      progress = diag.progress;
    } else if (diag.kind === 'motion') {
      tone = 'progress';
      title = t('feedback.moving', { word });
      progress = diag.progress;
      alternatives = diag.alternatives ?? [];
    } else if (diag.kind === 'shape') {
      tone = 'warn';
      title = mode === 'practice' ? t('feedback.trying', { word }) : t('feedback.almost', { word });
    } else {
      tone = 'warn';
      title = t('feedback.unknown');
    }
    lines = diag.issues.map(issueText);
    if (diag.looksLike) lines.push(t('feedback.looksLike', { word: phrase(GESTURE_BY_ID[diag.looksLike]) }));
  } else if (frame?.status === 'detected') {
    tone = 'ok-soft';
    title = t('feedback.good');
    lines = [t('feedback.noIssues')];
  } else {
    lines = [t('feedback.noIssues')];
  }

  const marks = diag?.fingerMarks ?? {};
  const showFingers = running && diag && Object.keys(marks).length > 0 && !flash;

  return (
    <div className={`card feedback tone-${tone}`} aria-live="polite">
      <div className="feedback-head">
        <span className="badge">⚠ {t('feedback.title')}</span>
        {diag?.match != null && diag.kind !== 'unknown' && !flash && (
          <span className="match-chip">
            {t('live.match')} {Math.round(diag.match * 100)}%
          </span>
        )}
      </div>
      <h3 className="feedback-title">{title}</h3>
      {lines.length > 0 && (
        <ul className="feedback-lines">
          {lines.map((l, i) => (
            <li key={i} className={i === 0 ? 'primary' : ''}>
              {l}
            </li>
          ))}
        </ul>
      )}
      {progress != null && (
        <div className="progress" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      {alternatives.length > 0 && (
        <div className="alts">
          <span className="muted">{t('feedback.or')}:</span>
          {alternatives.map((a) => (
            <span className="alt" key={a.gestureId}>
              <b>{phrase(GESTURE_BY_ID[a.gestureId])}</b> — {issueText(a)}
            </span>
          ))}
        </div>
      )}
      {showFingers && (
        <div className="finger-map" aria-label="Fingers">
          {FINGER_ORDER.map((f) => (
            <span key={f} className={`finger-dot ${marks[f] ?? 'na'}`}>
              <i />
              {t(`fingers.nom.${f}`)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
