import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FILTERS, FILTER_KEYS } from '../edit.js'

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

export default function FilterPanel({ edit, commit, thumb }) {
  const { t } = useTranslation()
  return (
    <div className="ed-filters" role="radiogroup" aria-label={t('editor.tool.filters')}>
      {FILTER_KEYS.map((name) => (
        <button key={name} type="button" role="radio" aria-checked={edit.filter === name}
          className={'ed-filter' + (edit.filter === name ? ' on' : '')}
          onClick={() => commit((e) => ({ ...e, filter: name }))}>
          <Thumb thumb={thumb} name={name} />
          <span>{t(`editor.filter.${name}`)}</span>
        </button>
      ))}
    </div>
  )
}
