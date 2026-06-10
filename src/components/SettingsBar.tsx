import { Globe } from 'lucide-react'
import { LANG_LABELS, TIMEZONES, setLang, setTz, useSettings, useT, type Lang } from '../lib/i18n'

// Player-facing language + timezone switcher. Settings persist in localStorage
// and update every time display / translated string live via the i18n store.
export function SettingsBar() {
  const { lang, tz } = useSettings()
  const t = useT()
  return (
    <div className="settings-bar">
      <Globe size={15} />
      <label className="settings-field">
        <span>{t('言語')}</span>
        <select value={lang} onChange={(event) => setLang(event.target.value as Lang)}>
          {(['ja', 'en', 'es'] as Lang[]).map((code) => (
            <option key={code} value={code}>
              {LANG_LABELS[code]}
            </option>
          ))}
        </select>
      </label>
      <label className="settings-field">
        <span>{t('タイムゾーン')}</span>
        <select value={tz} onChange={(event) => setTz(event.target.value)}>
          {TIMEZONES.map((zone) => (
            <option key={zone.value} value={zone.value}>
              {zone[lang]}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
