import { useTranslation } from 'react-i18next'

const BOX = 24

function dims(ratio) {
  const [w, h] = ratio.split(':').map(Number)
  return w >= h ? { width: BOX, height: Math.round((BOX * h) / w) } : { width: Math.round((BOX * w) / h), height: BOX }
}

export default function RatioPicker({ options, value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="ratios" role="radiogroup" aria-label={t('common.aspectRatio')}>
      {options.map((r) => (
        <button key={r} type="button" role="radio" aria-checked={r === value}
          className={'ratio' + (r === value ? ' on' : '')} onClick={() => onChange(r)}>
          <span className="ratio-frame"><i style={dims(r)} /></span>
          <span>{r}</span>
        </button>
      ))}
    </div>
  )
}
