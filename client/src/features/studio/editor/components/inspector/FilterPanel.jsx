import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FILTERS, FILTER_KEYS } from '../../utils/pixels.js'

function Thumb({ thumb, name }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    c.width = thumb.width
    c.height = thumb.height
    const ctx = c.getContext('2d')
    ctx.filter = FILTERS[name] || 'none'
    ctx.drawImage(thumb, 0, 0)
  }, [thumb, name])
  return <canvas ref={ref} />
}

export default function FilterPanel({ layer, patch, thumb }) {
  const { t } = useTranslation()
  if (!layer) return <small>{t('editor.needImage')}</small>
  return (
    <div className="ed-filters" role="radiogroup" aria-label={t('editor.tool.filters')}>
      {FILTER_KEYS.map((name) => (
        <button key={name} type="button" role="radio" aria-checked={layer.filter === name}
          className={'ed-filter' + (layer.filter === name ? ' on' : '')}
          onClick={() => patch(layer.id, { filter: name })}>
          <Thumb thumb={thumb} name={name} />
          <span>{t(`editor.filter.${name}`)}</span>
        </button>
      ))}
    </div>
  )
}
