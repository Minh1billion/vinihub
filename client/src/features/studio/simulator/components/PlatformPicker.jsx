import { useTranslation } from 'react-i18next'
import PlatformLogo from './PlatformLogo.jsx'
import { PLATFORMS } from '../utils/platforms.js'

export default function PlatformPicker({ value, onChange, label }) {
  const { t } = useTranslation()
  return (
    <div className="plat-grid" role="radiogroup" aria-label={label}>
      {PLATFORMS.map((p) => (
        <button key={p} type="button" role="radio" aria-checked={p === value} className={'plat-tile' + (p === value ? ' on' : '')} onClick={() => onChange(p)}>
          <PlatformLogo platform={p} size={34} />
          <span>{t(`sim.platform.${p}`)}</span>
        </button>
      ))}
    </div>
  )
}
