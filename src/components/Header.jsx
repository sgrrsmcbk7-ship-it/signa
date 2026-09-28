import { useI18n } from '../i18n/index.jsx';
import { Logo, LangSwitch } from './StartScreen.jsx';

export function Header({ mode, setMode, onOpenSettings, onOpenVocab, lang, setLang }) {
  const { t } = useI18n();
  return (
    <header className="app-header">
      <Logo />
      <nav className="segmented" aria-label="Mode">
        {['live', 'practice'].map((m) => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)} aria-pressed={mode === m}>
            <i className="seg-ico" aria-hidden>
              {m === 'live' ? '💬' : '🎯'}
            </i>{' '}
            <span>{t(`modes.${m}`)}</span>
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <LangSwitch lang={lang} onChange={setLang} />
        <button className="icon-btn" onClick={onOpenVocab} title={t('live.vocabulary')} aria-label={t('live.vocabulary')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <path d="M4 5h7v14H4zM13 5h7v14h-7z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </button>
        <button className="icon-btn" onClick={onOpenSettings} title={t('settings.title')} aria-label={t('settings.title')}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
            <path
              d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
