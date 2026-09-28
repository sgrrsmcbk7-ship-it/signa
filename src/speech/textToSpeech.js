// Browser-native Text-to-Speech (window.speechSynthesis). No API keys, works offline for
// most OS voices.

export const SPEECH_LANG = { en: 'en-US', ru: 'ru-RU', kk: 'kk-KZ' };
// If the OS has no Kazakh voice, a Russian voice reads Cyrillic text reasonably well.
const FALLBACK_LANG = { kk: ['kk', 'ru'], ru: ['ru'], en: ['en'] };

export const ttsSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let voicesCache = [];
export function getVoices() {
  if (!ttsSupported()) return [];
  const v = window.speechSynthesis.getVoices();
  if (v.length) voicesCache = v;
  return voicesCache;
}

export function onVoicesChanged(cb) {
  if (!ttsSupported()) return () => {};
  const handler = () => cb(getVoices());
  window.speechSynthesis.addEventListener?.('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener?.('voiceschanged', handler);
}

export function pickVoice(lang, preferredURI) {
  const voices = getVoices();
  if (preferredURI) {
    const v = voices.find((x) => x.voiceURI === preferredURI);
    if (v) return v;
  }
  for (const prefix of FALLBACK_LANG[lang] ?? ['en']) {
    const matches = voices.filter((v) => v.lang?.toLowerCase().startsWith(prefix));
    if (matches.length) {
      // Prefer natural / online voices when available (Chrome "Google …", Edge "Natural").
      return matches.find((v) => /natural|google|premium|enhanced/i.test(v.name)) ?? matches[0];
    }
  }
  return null;
}

/** Speaks text; interrupts whatever is currently being said. Resolves when finished. */
export function speak(text, { lang = 'en', rate = 1, voiceURI = '' } = {}) {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text) return resolve(false);
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(lang, voiceURI);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else u.lang = SPEECH_LANG[lang] ?? 'en-US';
    u.rate = rate;
    u.pitch = 1;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
    // Chrome sometimes stays paused after tab switches.
    if (synth.paused) synth.resume();
  });
}

export function stopSpeaking() {
  if (ttsSupported()) window.speechSynthesis.cancel();
}
