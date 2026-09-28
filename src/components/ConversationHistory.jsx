import { memo, useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { GESTURE_BY_ID } from '../data/gestures.js';
import { HandGlyph } from './HandGlyph.jsx';
import { sttSupported, listenOnce } from '../speech/speechToText.js';

function time(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ConversationHistoryBase({ items, onClear, onPlay, onReply }) {
  const { t, phrase, lang } = useI18n();
  const listRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [listening, setListening] = useState(false);
  const stopRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [items.length]);

  const send = (e) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onReply(text);
    setDraft('');
  };

  const mic = () => {
    if (listening) {
      stopRef.current?.();
      return;
    }
    setListening(true);
    stopRef.current = listenOnce(lang, {
      onResult: (text, final) => {
        setDraft(text);
        if (final && text.trim()) {
          onReply(text.trim());
          setDraft('');
        }
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
  };

  return (
    <div className="card history">
      <div className="card-head">
        <h3>{t('history.title')}</h3>
        {items.length > 0 && (
          <button className="link-btn" onClick={onClear}>
            {t('history.clear')}
          </button>
        )}
      </div>
      <ol className="chat" ref={listRef}>
        {items.length === 0 && <li className="chat-empty muted">{t('history.empty')}</li>}
        {items.map((it) => {
          const g = it.gestureId ? GESTURE_BY_ID[it.gestureId] : null;
          return (
            <li key={it.id} className={`bubble ${it.from}`}>
              <div className="bubble-meta">
                {it.from === 'signer' ? `🤟 ${t('history.you')}` : `🗣 ${t('history.partner')}`} · {time(it.at)}
              </div>
              <div className="bubble-body">
                {g && <HandGlyph gesture={g} size={34} />}
                <span className="bubble-text">{g ? phrase(g) : it.text}</span>
                {g && (
                  <button className="mini-btn" onClick={() => onPlay(it)} aria-label={t('history.play')} title={t('history.play')}>
                    🔊
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <form className="reply" onSubmit={send}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={listening ? t('history.listening') : t('history.replyPlaceholder')}
          aria-label={t('history.replyPlaceholder')}
        />
        {sttSupported() && (
          <button type="button" className={`icon-btn ${listening ? 'rec' : ''}`} onClick={mic} title={t('history.mic')} aria-label={t('history.mic')}>
            🎙
          </button>
        )}
        <button type="submit" className="btn btn-soft" disabled={!draft.trim()}>
          {t('history.send')}
        </button>
      </form>
    </div>
  );
}

export const ConversationHistory = memo(ConversationHistoryBase);
