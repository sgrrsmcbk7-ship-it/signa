import { useI18n } from '../i18n/index.jsx';
import { GESTURE_BY_ID } from '../data/gestures.js';

const STATUS_ICON = {
  loading: '◌',
  searching: '◌',
  detected: '✋',
  blocked: '!',
  almost: '≈',
  holding: '⏳',
  motion: '↔',
  confirmed: '✓',
};

export function CameraView({ videoRef, canvasRef, phase, error, frame, perf, onRetry, mode, targetId }) {
  const { t, phrase, issueText } = useI18n();
  const running = phase === 'running';
  const status = running ? frame?.status ?? 'searching' : 'loading';
  const diag = frame?.diag;
  const flashGesture = frame?.flash ? GESTURE_BY_ID[frame.flash.gestureId] : null;

  // Primary coaching line shown ON the video (the user is looking at their hand).
  const issue = frame?.issues?.[0] ?? diag?.issues?.[0];
  const issueTone = frame?.issues?.length ? 'err' : diag?.kind === 'shape' || diag?.kind === 'unknown' ? 'warn' : 'info';

  // Floating label above the hand (mirrored x because the video is mirrored).
  let label = null;
  if (running && frame?.features && diag?.gestureId && diag.kind !== 'unknown' && !frame.flash) {
    const { minX, maxX, minY, maxY } = frame.features.bbox;
    const below = minY < 0.16; // no room above the hand → show the label under it
    label = {
      left: `${Math.min(92, Math.max(8, (1 - (minX + maxX) / 2) * 100))}%`,
      top: below ? `${Math.min(88, maxY * 100 + 3)}%` : `${minY * 100 - 3}%`,
      below,
      text: phrase(GESTURE_BY_ID[diag.gestureId]),
      match: Math.round((diag.match ?? 0) * 100),
      kind: diag.kind,
    };
  }

  return (
    <section className={`stage status-${status}`} aria-label="Camera">
      <div className="stage-inner">
        <video ref={videoRef} className="mirror" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="mirror overlay" />
        <div className="scanlines" aria-hidden />

        {running && (
          <div className={`status-pill s-${status}`} role="status" aria-live="polite">
            <span className="dot" /> {STATUS_ICON[status]} {t(`status.${status}`)}
          </div>
        )}
        {running && perf.fps > 0 && (
          <div className="perf-pill" title="Frames per second · inference backend">
            {perf.fps} fps · {perf.delegate}
          </div>
        )}
        {mode === 'practice' && targetId && running && (
          <div className="target-pill">
            🎯 {t('practice.try')}: <b>{phrase(GESTURE_BY_ID[targetId])}</b>
          </div>
        )}

        {label && (
          <div className={`hand-label k-${label.kind} ${label.below ? 'below' : ''}`} style={{ left: label.left, top: label.top }}>
            {label.text} <small>{label.match}%</small>
          </div>
        )}

        {running && issue && !frame?.flash && (
          <div className={`stage-hint tone-${issueTone}`} role="alert">
            {issueText(issue)}
          </div>
        )}

        {flashGesture && (
          <div className="flash" key={frame.flash.until}>
            <span className="flash-check">✓</span>
            <span className="flash-word">{phrase(flashGesture)}</span>
          </div>
        )}

        {!running && (
          <div className="stage-overlay">
            {phase === 'error' ? (
              <div className="stage-error">
                <div className="err-icon">!</div>
                <h3>{t(`camera.${error}`)}</h3>
                <p>{t(`camera.${error}Help`)}</p>
                <button className="btn btn-primary" onClick={onRetry}>
                  {t('camera.retry')}
                </button>
              </div>
            ) : (
              <div className="stage-loading">
                <div className="loader" />
                <p>{phase === 'loading' ? t('camera.loadingModel') : t('camera.starting')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
