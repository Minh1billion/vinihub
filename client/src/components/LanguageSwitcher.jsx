import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClickOutside } from '../hooks/useClickOutside.js'
import { LANGUAGES } from '../i18n/index.js'
import { switchLanguage } from '../i18n/switch.js'
import Flag from './Flag.jsx'
import Icon from './Icon.jsx'

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close)
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) || LANGUAGES[0]

  const pick = (code) => { switchLanguage(code, close) }

  return (
    <div className="lang-dd" ref={ref} onKeyDown={(e) => e.key === 'Escape' && close()}>
      <button type="button" className="lang-trigger" aria-haspopup="listbox" aria-expanded={open}
        aria-label={`${t('common.language')}: ${current.name}`} onClick={() => setOpen((o) => !o)}>
        <Flag code={current.code} />
        <span>{current.label}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className="lang-list" role="listbox" aria-label={t('common.language')}>
          {LANGUAGES.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" lang={l.code} aria-selected={l.code === current.code} onClick={() => pick(l.code)}>
                <Flag code={l.code} />
                <span>{l.name}</span>
                {l.code === current.code && <Icon name="check" size={16} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
