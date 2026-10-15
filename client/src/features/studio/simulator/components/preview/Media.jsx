import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../../../../../components/Icon.jsx'

export function Clip({ item }) {
  return item.kind === 'video'
    ? <video src={item.url} autoPlay muted loop playsInline />
    : <img src={item.url} alt="" draggable="false" />
}

export function Empty() {
  const { t } = useTranslation()
  return <div className="sim-empty"><Icon name="image" size={28} /><span>{t('sim.addMedia')}</span></div>
}

export function Carousel({ media, ratio, className = '', counter = false }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const at = Math.min(index, Math.max(media.length - 1, 0))
  const item = media[at]
  return (
    <div className={'sim-media ' + className} style={ratio ? { aspectRatio: ratio } : undefined}>
      {item ? <Clip key={item.id} item={item} /> : <Empty />}
      {media.length > 1 && (
        <>
          {at > 0 && <button type="button" className="sim-nav prev" aria-label={t('sim.prev')} onClick={() => setIndex(at - 1)}><Icon name="chevron" size={16} /></button>}
          {at < media.length - 1 && <button type="button" className="sim-nav next" aria-label={t('sim.next')} onClick={() => setIndex(at + 1)}><Icon name="chevron" size={16} /></button>}
          {counter && <span className="sim-count">{at + 1}/{media.length}</span>}
          <span className="sim-dots" aria-hidden="true">{media.map((m, i) => <i key={m.id} className={i === at ? 'on' : ''} />)}</span>
        </>
      )}
    </div>
  )
}
