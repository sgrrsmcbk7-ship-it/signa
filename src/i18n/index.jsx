import { createContext, useCallback, useContext, useMemo } from 'react';
import en from './en.js';
import ru from './ru.js';
import kk from './kk.js';
import { localized } from '../data/gestures.js';

export const DICTS = { en, ru, kk };
export const LANGS = Object.keys(DICTS);

const I18nContext = createContext(null);

function lookup(dict, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
}

function interpolate(str, params) {
  if (typeof str !== 'string' || !params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] ?? `{${k}}`));
}

export function I18nProvider({ lang, children }) {
  const value = useMemo(() => {
    const dict = DICTS[lang] ?? en;
    const t = (path, params) => interpolate(lookup(dict, path) ?? lookup(en, path) ?? path, params);

    /** Turns an Error Mode issue object into a human sentence in the current language. */
    const issueText = (issue) => {
      if (!issue) return '';
      if (issue.key === 'motion') return t(`motion.${issue.type}.${issue.issue ?? 'start'}`);
      if (issue.key === 'outOfFrame') return t(`hint.outOfFrame.${issue.params?.where ?? 'center'}`);
      const fp = (form, f) => (f ? t(`fingers.${form}.${f}`) : '');
      return t(`hint.${issue.key}`, {
        finger: fp('acc', issue.finger),
        fingerNom: fp('nom', issue.finger),
        fingerGen: fp('gen', issue.finger),
        finger2: fp('acc', issue.finger2),
        finger2Gen: fp('gen', issue.finger2),
        sec: issue.sec,
      });
    };

    return {
      lang,
      t,
      issueText,
      phrase: (g) => localized(g?.phrase, lang),
      speech: (g) => localized(g?.speech, lang),
      howTo: (g) => localized(g?.howTo, lang),
    };
  }, [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

export function useT() {
  const { t } = useI18n();
  return useCallback(t, [t]);
}
