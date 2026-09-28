import { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { DEFAULT_SETTINGS } from './config.js';
import { GESTURES, GESTURE_BY_ID, localized } from './data/gestures.js';
import { useLocalStorage } from './hooks/useLocalStorage.js';
import { useRecognition, preloadTracker } from './hooks/useRecognition.js';
import { speak, getVoices } from './speech/textToSpeech.js';
import { sfx } from './speech/soundEffects.js';
import { WelcomeScreen, CameraScreen } from './components/StartScreen.jsx';
import { Header } from './components/Header.jsx';
import { CameraView } from './components/CameraView.jsx';
import { GestureResult } from './components/GestureResult.jsx';
import { ErrorFeedback } from './components/ErrorFeedback.jsx';
import { ConversationHistory } from './components/ConversationHistory.jsx';
import { PracticeTarget, PracticeGrid } from './components/PracticeMode.jsx';
import { Settings } from './components/Settings.jsx';
import { Vocabulary } from './components/Vocabulary.jsx';
import { DebugPanel } from './components/DebugPanel.jsx';

let uid = 0;
const nextId = () => `${Date.now()}-${uid++}`;

export default function App() {
  const [settings, patch] = useLocalStorage('signa.settings', DEFAULT_SETTINGS);
  const [screen, setScreen] = useState('welcome');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('large-text', settings.largeText);
    root.classList.toggle('high-contrast', settings.highContrast);
    root.lang = settings.lang === 'kk' ? 'kk' : settings.lang;
  }, [settings.largeText, settings.highContrast, settings.lang]);

  const setLang = useCallback((lang) => patch({ lang, voiceURI: '' }), [patch]);

  const begin = () => {
    sfx.unlock(); // browsers only allow audio after a user gesture
    getVoices(); // warms up the voice list
    preloadTracker().catch(() => {}); // download the model while the user reads step 2
    setScreen('camera');
  };

  return (
    <I18nProvider lang={settings.lang}>
      {screen === 'welcome' && <WelcomeScreen onStart={begin} lang={settings.lang} setLang={setLang} />}
      {screen === 'camera' && <CameraScreen onEnable={() => setScreen('app')} onBack={() => setScreen('welcome')} />}
      {screen === 'app' && <MainScreen settings={settings} patch={patch} setLang={setLang} />}
    </I18nProvider>
  );
}

function MainScreen({ settings, patch, setLang }) {
  const { t, lang } = useI18n();
  const [mode, setMode] = useState('live');
  const [targetId, setTargetId] = useState(GESTURES[0].id);
  const [learned, , setLearned] = useLocalStorage('signa.learned', {});
  const [history, setHistory] = useState([]);
  const [last, setLast] = useState(null);
  const [speaking, setSpeaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vocabOpen, setVocabOpen] = useState(false);

  const say = useCallback(
    async (text) => {
      if (!settings.voice || !text) return;
      setSpeaking(true);
      await speak(text, { lang, rate: settings.rate, voiceURI: settings.voiceURI });
      setSpeaking(false);
    },
    [settings.voice, settings.rate, settings.voiceURI, lang],
  );

  const onConfirm = (ev) => {
    const g = GESTURE_BY_ID[ev.gestureId];
    setLast(ev);
    say(localized(g.speech, lang));
    if (mode === 'practice') {
      if (settings.sfx) sfx.success();
      setSuccess(true);
      setLearned((l) => ({ ...l, [g.id]: true }));
    } else {
      if (settings.sfx) sfx.confirm();
      setHistory((h) => [...h.slice(-59), { id: nextId(), from: 'signer', gestureId: g.id, at: ev.at }]);
    }
  };

  const { videoRef, canvasRef, phase, error, frame, perf, start } = useRecognition({
    mode,
    targetId,
    settings,
    onConfirm,
  });

  useEffect(() => {
    start();
  }, [start]);

  const goNext = useCallback(() => {
    setSuccess(false);
    setTargetId((cur) => {
      const i = GESTURES.findIndex((g) => g.id === cur);
      for (let k = 1; k <= GESTURES.length; k++) {
        const g = GESTURES[(i + k) % GESTURES.length];
        if (!learned[g.id]) return g.id;
      }
      return GESTURES[(i + 1) % GESTURES.length].id;
    });
  }, [learned]);

  // Practice is hands-free: after a success we move on automatically.
  useEffect(() => {
    if (!success) return undefined;
    const id = setTimeout(goNext, 2000);
    return () => clearTimeout(id);
  }, [success, goNext]);

  const pick = useCallback((id) => {
    setSuccess(false);
    setTargetId(id);
    setMode('practice');
  }, []);

  const onReply = useCallback((text) => {
    setHistory((h) => [...h.slice(-59), { id: nextId(), from: 'partner', text, at: Date.now() }]);
  }, []);
  const onPlay = useCallback((it) => say(localized(GESTURE_BY_ID[it.gestureId]?.speech, lang)), [say, lang]);
  const onClear = useCallback(() => setHistory([]), []);
  const onResetProgress = useCallback(() => setLearned({}), [setLearned]);

  const switchMode = (m) => {
    setSuccess(false);
    setMode(m);
  };

  const running = phase === 'running';
  const marks = useMemo(
    () => (mode === 'practice' && frame?.diag?.gestureId === targetId ? frame.diag.fingerMarks : null),
    [mode, frame, targetId],
  );

  return (
    <div className={`app mode-${mode}`}>
      <Header
        mode={mode}
        setMode={switchMode}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenVocab={() => setVocabOpen(true)}
        lang={settings.lang}
        setLang={setLang}
      />
      <main className="layout">
        <div className="col-stage">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            phase={phase}
            error={error}
            frame={frame}
            perf={perf}
            onRetry={start}
            mode={mode}
            targetId={targetId}
          />
          {settings.debug && <DebugPanel frame={frame} />}
        </div>
        <div className="col-side">
          {mode === 'live' ? (
            <>
              <GestureResult
                last={last}
                speaking={speaking}
                onRepeat={() => last && say(localized(GESTURE_BY_ID[last.gestureId].speech, lang))}
              />
              <ErrorFeedback frame={frame} running={running} mode={mode} />
              <ConversationHistory items={history} onClear={onClear} onPlay={onPlay} onReply={onReply} />
            </>
          ) : (
            <>
              <PracticeTarget targetId={targetId} success={success} marks={marks} onNext={goNext} />
              <ErrorFeedback frame={frame} running={running} mode={mode} />
              <PracticeGrid targetId={targetId} learned={learned} onPick={pick} onReset={onResetProgress} />
            </>
          )}
        </div>
      </main>
      <footer className="app-footer">🔒 {t('footer')}</footer>
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={settings} patch={patch} />
      <Vocabulary
        open={vocabOpen}
        onClose={() => setVocabOpen(false)}
        onPractice={(id) => {
          setVocabOpen(false);
          pick(id);
        }}
      />
    </div>
  );
}
