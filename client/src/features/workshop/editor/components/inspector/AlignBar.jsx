import { useTranslation } from 'react-i18next'
import Icon from '@/shared/ui/Icon.jsx'
import { aabb, boundsOf } from '../../utils/edit.js'

const ACTIONS = [
  ['left', 'alignL'],
  ['centerH', 'alignCH'],
  ['right', 'alignR'],
  ['top', 'alignT'],
  ['centerV', 'alignCV'],
  ['bottom', 'alignB'],
]

export default function AlignBar({ layer, frame, patch }) {
  const { t } = useTranslation()
  if (!frame) return null

  const run = (kind) => {
    const [bound] = boundsOf([layer])
    if (!bound) return
    const b = aabb(bound)
    const change = {
      left: { x: layer.x + frame.x - b.x },
      centerH: { x: layer.x + frame.x + frame.w / 2 - (b.x + b.w / 2) },
      right: { x: layer.x + frame.x + frame.w - (b.x + b.w) },
      top: { y: layer.y + frame.y - b.y },
      centerV: { y: layer.y + frame.y + frame.h / 2 - (b.y + b.h / 2) },
      bottom: { y: layer.y + frame.y + frame.h - (b.y + b.h) },
    }[kind]
    patch(layer.id, change)
  }

  return (
    <section className="ed-sec">
      <h4 className="ed-sec-title">{t('editor.group.align')}</h4>
      <div className="ed-align" role="group" aria-label={t('editor.group.align')}>
        {ACTIONS.map(([kind, icon]) => (
          <button key={kind} type="button" className="ed-lbtn" disabled={layer.locked} data-tip={t(`editor.align.${kind}`)} aria-label={t(`editor.align.${kind}`)} onClick={() => run(kind)}>
            <Icon name={icon} size={16} />
          </button>
        ))}
      </div>
    </section>
  )
}
