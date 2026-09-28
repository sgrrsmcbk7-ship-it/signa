import { useI18n, LANGS, DICTS } from '../i18n/index.jsx';
import { GESTURE_BY_ID } from '../data/gestures.js';
import { HandGlyph } from './HandGlyph.jsx';

export function LangSwitch({ lang, onChange }) {
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      {LANGS.map((l) => (
        <button
          key={l}
          className={l === lang ? 'active' : ''}
          onClick={() => onChange(l)}
          aria-pressed={l === lang}
          title={DICTS[l].langName}
        >
          {l === 'kk' ? 'KZ' : l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

const SHOWCASE = ['hello', 'i_love_you', 'yes', 'thank_you', 'help', 'drink'];

export function WelcomeScreen({ onStart, lang, setLang }) {
  const { t, phrase } = useI18n();
  return (
    <div className="onboarding">
      <header className="onb-top">
        <Logo />
        <LangSwitch lang={lang} onChange={setLang} />
      </header>
      <main className="hero">
        <div className="hero-copy">
          <span className="kicker">{t('start.kicker')}</span>
          <h1>
            {t('start.title1')}
            <br />
            <span className="grad">{t('start.title2')}</span>
          </h1>
          <p className="lead">{t('start.sub')}</p>
          <button className="btn btn-primary btn-xl" onClick={onStart} autoFocus>
            {t('start.cta')} <span aria-hidden>→</span>
          </button>
          <ul className="chips">
            {t('start.chips').map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="hero-visual" aria-hidden>
          <div className="orbit">
            {SHOWCASE.map((id, i) => (
              <div key={id} className="orbit-card" style={{ '--i': i }}>
                <HandGlyph gesture={GESTURE_BY_ID[id]} size={64} />
                <span>{phrase(GESTURE_BY_ID[id])}</span>
              </div>
            ))}
            <div className="orbit-core">
              <span className="core-wave" />
              <span className="core-label">🔊</span>
            </div>
          </div>
        </div>
      </main>
      <ol className="steps">
        {t('start.steps').map(([title, text], i) => (
          <li key={title}>
            <span className="step-n">{i + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function CameraScreen({ onEnable, onBack }) {
  const { t } = useI18n();
  return (
    <div className="onboarding center">
      <div className="card permission-card">
        <div className="cam-icon" aria-hidden>
          <svg viewBox="0 0 48 48" width="56" height="56">
            <rect x="4" y="12" width="30" height="24" rx="6" fill="none" stroke="currentColor" strokeWidth="3" />
            <path d="M34 20 L44 14 L44 34 L34 28 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <circle cx="19" cy="24" r="5" fill="currentColor" />
          </svg>
        </div>
        <span className="kicker">2 / 3</span>
        <h2>{t('camera.title')}</h2>
        <p className="lead">{t('camera.text')}</p>
        <ul className="checks">
          {t('camera.points').map((p) => (
            <li key={p}>✓ {p}</li>
          ))}
        </ul>
        <div className="row gap">
          <button className="btn btn-ghost" onClick={onBack}>
            {t('camera.back')}
          </button>
          <button className="btn btn-primary btn-lg" onClick={onEnable} autoFocus>
            {t('camera.enable')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Logo() {
  return (
    <div className="logo">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden>
        <defs>
          <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5eead4" />
            <stop offset="1" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill="url(#lg)" />
        <path d="M11 22 V12 M15 22 V9 M19 22 V10 M23 22 V13 M9 19 Q7 16 8 14" stroke="#07090f" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </svg>
      <span>Signa</span>
    </div>
  );
}
