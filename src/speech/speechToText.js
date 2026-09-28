// Optional: lets the hearing partner answer by voice, so the conversation goes both ways.
// Uses the browser's Web Speech Recognition API (Chrome / Edge / Safari). NOTE: in Chrome this
// API streams audio to the browser vendor's speech service — it is opt-in (mic button) and is
// never used for the camera / sign recognition, which stays 100% local.

import { SPEECH_LANG } from './textToSpeech.js';

const Recognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

export const sttSupported = () => !!Recognition;

export function listenOnce(lang, { onResult, onEnd, onError }) {
  if (!Recognition) return null;
  const rec = new Recognition();
  rec.lang = SPEECH_LANG[lang] ?? 'en-US';
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  rec.onresult = (e) => {
    const res = e.results[e.results.length - 1];
    onResult?.(res[0].transcript, res.isFinal);
  };
  rec.onerror = (e) => onError?.(e.error);
  rec.onend = () => onEnd?.();
  rec.start();
  return () => rec.abort();
}
