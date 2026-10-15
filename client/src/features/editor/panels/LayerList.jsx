import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../../../components/Icon.jsx'
import { layerLabel } from '../layers.js'

const THUMB = 56

function Thumb({ layer }) {
  const ref = useRef(null)
  const bitmap = layer.bitmap
  useEffect(() => {
    if (!bitmap) return
    const c = ref.current
    const k = Math.min(THUMB / bitmap.width, THUMB / bitmap.height)
    const w = bitmap.width * k
    const h = bitmap.height * k
    const g = c.getContext('2d')
    g.clearRect(0, 0, THUMB, THUMB)
    g.drawImage(bitmap, (THUMB - w) / 2, (THUMB - h) / 2, w, h)
  }, [bitmap])
  if (layer.type === 'text') return <span className="ed-thumb"><Icon name="type" size={16} /></span>
  return <canvas ref={ref} className="ed-thumb" width={THUMB} height={THUMB} />
}

export default function LayerList({ layers, selected, onSelect, onPatch, onReorder }) {
  const { t } = useTranslation()
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const rows = layers.slice().reverse()

  const finish = () => { setDragId(null); setOverId(null) }

  return (
    <ul className="ed-layerlist" aria-label={t('editor.layers.list')}>
      {rows.map((layer) => (
        <li key={layer.id}
          className={'ed-row' + (layer.id === selected ? ' on' : '') + (layer.id === dragId ? ' is-drag' : '') + (layer.id === overId && dragId && overId !== dragId ? ' is-over' : '') + (layer.visible ? '' : ' is-hidden')}
          draggable
          onDragStart={(e) => { setDragId(layer.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', layer.id) }}
          onDragOver={(e) => { if (!dragId) return; e.preventDefault(); e.stopPropagation(); setOverId(layer.id) }}
          onDrop={(e) => { if (!dragId) return; e.preventDefault(); e.stopPropagation(); onReorder(dragId, layer.id); finish() }}
          onDragEnd={finish}>
          <button type="button" className="ed-row-main" aria-pressed={layer.id === selected} onClick={() => onSelect(layer.id)}>
            <Thumb layer={layer} />
            <span className="ed-row-name">{layerLabel(layer, t)}</span>
          </button>
          <button type="button" className={'icon-btn sm' + (layer.visible ? '' : ' is-off')} aria-pressed={!layer.visible}
            aria-label={layer.visible ? t('editor.layers.hide') : t('editor.layers.show')} title={layer.visible ? t('editor.layers.hide') : t('editor.layers.show')}
            onClick={() => onPatch(layer.id, { visible: !layer.visible })}>
            <Icon name={layer.visible ? 'eye' : 'eyeOff'} size={14} />
          </button>
          <button type="button" className={'icon-btn sm' + (layer.locked ? ' is-on' : '')} aria-pressed={layer.locked}
            aria-label={layer.locked ? t('editor.layers.unlock') : t('editor.layers.lock')} title={layer.locked ? t('editor.layers.unlock') : t('editor.layers.lock')}
            onClick={() => onPatch(layer.id, { locked: !layer.locked })}>
            <Icon name={layer.locked ? 'lock' : 'unlock'} size={14} />
          </button>
        </li>
      ))}
    </ul>
  )
}
