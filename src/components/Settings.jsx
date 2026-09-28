import { useEffect, useState } from 'react';
import { useI18n, LANGS, DICTS } from '../i18n/index.jsx';
import { getVoices, onVoicesChanged, SPEECH_LANG } from '../speech/textToSpeech.js';

function Toggle({ checked, onChange, label, help }) {
  return (
    <label className="toggle-row">
      <span>
        {label}
        {help && <small className="muted">{help}</small>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i className="switch" aria-hidden />
    </label>
  );
}

export function Settings({ open, onClose, settings, patch }) {
  const { t } = useI18n();
  const [voices, setVoices] = useState(getVoices());
  useEffect(() => onVoicesChanged(setVoices), []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const langPrefix = SPEECH_LANG[settings.lang].slice(0, 2);
  const langVoices = voices.filter((v) => v.lang?.toLowerCase().startsWith(langPrefix));

  return (
    <div className={`drawer-wrap ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label={t('settings.title')}>
        <div className="card-head">
          <h2>{t('settings.title')}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={t('settings.close')}>
            ✕
          </button>
        </div>

        <div className="field">
          <span className="field-label">{t('settings.language')}</span>
          <div className="segmented small">
            {LANGS.map((l) => (
              <button key={l} className={settings.lang === l ? 'active' : ''} onClick={() => patch({ lang: l, voiceURI: '' })}>
                {DICTS[l].langName}
              </button>
            ))}
          </div>
        </div>

        <Toggle checked={settings.voice} onChange={(v) => patch({ voice: v })} label={`🔊 ${t('settings.voice')}`} />

        <div className="field">
          <span className="field-label">{t('settings.voiceSel')}</span>
          <select value={settings.voiceURI} onChange={(e) => patch({ voiceURI: e.target.value })}>
            <option value="">{t('settings.auto')}</option>
            {langVoices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
          {langVoices.length === 0 && <small className="muted">{t('settings.noVoices')}</small>}
        </div>

        <div className="field">
          <span className="field-label">
            {t('settings.rate')} · {settings.rate.toFixed(1)}×
          </span>
          <input
            type="range"
            min="0.6"
            max="1.4"
            step="0.1"
            value={settings.rate}
            onChange={(e) => patch({ rate: Number(e.target.value) })}
          />
        </div>

        <div className="field">
          <span className="field-label">{t('settings.sensitivity')}</span>
          <div className="segmented small">
            {['relaxed', 'normal', 'strict'].map((s) => (
              <button key={s} className={settings.sensitivity === s ? 'active' : ''} onClick={() => patch({ sensitivity: s })}>
                {t(`settings.${s}`)}
              </button>
            ))}
          </div>
        </div>

        <Toggle checked={settings.sfx} onChange={(v) => patch({ sfx: v })} label={t('settings.sfx')} />
        <Toggle checked={settings.showSkeleton} onChange={(v) => patch({ showSkeleton: v })} label={t('settings.skeleton')} />
        <Toggle checked={settings.largeText} onChange={(v) => patch({ largeText: v })} label={t('settings.largeText')} />
        <Toggle checked={settings.highContrast} onChange={(v) => patch({ highContrast: v })} label={t('settings.highContrast')} />
        <Toggle checked={settings.debug} onChange={(v) => patch({ debug: v })} label={t('settings.debug')} />
        <Toggle
          checked={settings.invertPalm}
          onChange={(v) => patch({ invertPalm: v })}
          label={t('settings.invertPalm')}
          help={t('settings.invertPalmHelp')}
        />
      </aside>
    </div>
  );
}
