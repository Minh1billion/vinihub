import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../../../../components/Icon.jsx'
import AddImage from './AddImage.jsx'
import { LAYER_TYPES, emptyLabel, layerName } from '../utils/layers.js'
import { ASSET_MIME } from '../utils/source.js'

const SIDE = 64

function Thumb({ source }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current
    c.width = SIDE
    c.height = SIDE
    const k = Math.max(SIDE / source.width, SIDE / source.height)
    const w = source.width * k
    const h = source.height * k
    c.getContext('2d').drawImage(source, (SIDE - w) / 2, (SIDE - h) / 2, w, h)
  }, [source])
  return <canvas ref={ref} className="ed-lthumb" />
}

function Kind({ layer }) {
  if (layer.type === 'image') return <Thumb source={layer.bitmap} />
  const kind = LAYER_TYPES[layer.type]
  return <span className="ed-lkind"><Icon name={kind.icon} size={16} /></span>
}

function Tool({ icon, label, onClick, disabled, on, danger }) {
  return (
    <button type="button" className={'ed-lbtn' + (on ? ' on' : '') + (danger ? ' danger' : '')} title={label} aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick() }}>
      <Icon name={icon} size={16} />
    </button>
  )
}

export default function LayersPanel({ edit, actions, selected, onSelect, onFiles, onMenu }) {
  const { t } = useTranslation()
  const list = [...edit.layers].reverse()
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const finish = () => { setDragId(null); setOverId(null) }
  const [filing, setFiling] = useState(false)
  const hasFiles = (e) => [...e.dataTransfer.types].some((x) => x === 'Files' || x === ASSET_MIME)

  return (
    <section className={'ed-layers-panel' + (filing ? ' is-drop' : '')} aria-label={t('editor.layers.title')}
      onDragOver={(e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setFiling(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFiling(false) }}
      onDrop={(e) => { setFiling(false); if (!hasFiles(e)) return; e.preventDefault(); onFiles([...e.dataTransfer.files], null, e.dataTransfer.getData(ASSET_MIME)) }}>
      <header className="ed-lhead">
        <Icon name="layers" size={18} />
        <strong>{t('editor.layers.title')}</strong>
        <span className="ed-lcount num">{edit.layers.length}</span>
        <button type="button" className="ed-ladd" onClick={actions.addText} title={t('editor.text.add')} aria-label={t('editor.text.add')}>
          <Icon name="type" size={16} />
        </button>
        <button type="button" className="ed-ladd" onClick={() => actions.addShape('rect')} title={t('editor.shape.add')} aria-label={t('editor.shape.add')}>
          <Icon name="shape" size={16} />
        </button>
        <AddImage onFile={actions.addImage}>
          {(open) => (
            <button type="button" className="ed-ladd" onClick={open} title={t('editor.image.add')} aria-label={t('editor.image.add')}>
              <Icon name="image" size={16} />
            </button>
          )}
        </AddImage>
      </header>
      <div className="ed-llist">
        {list.map((x, n) => (
          <div key={x.id} className={'ed-lrow' + (x.id === selected ? ' on' : '') + (x.hidden ? ' is-hidden' : '') + (x.id === dragId ? ' is-drag' : '') + (dragId && x.id === overId && overId !== dragId ? ' is-over' : '')} role="button" tabIndex={0}
            draggable
            onDragStart={(e) => { setDragId(x.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', x.id) }}
            onDragOver={(e) => { if (!dragId) return; e.preventDefault(); setOverId(x.id) }}
            onDrop={(e) => { if (!dragId) return; e.preventDefault(); actions.reorder(dragId, x.id); finish() }}
            onDragEnd={finish}
            onContextMenu={(e) => { e.preventDefault(); onMenu({ x: e.clientX, y: e.clientY, id: x.id }) }}
            onClick={() => onSelect(x.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(x.id) } }}>
            <Kind layer={x} />
            <span className="ed-lname">{layerName(x, emptyLabel(x, t))}</span>
            <span className="ed-lacts">
              <Tool icon="arrowUp" label={t('editor.layers.up')} disabled={n === 0} onClick={() => actions.move(x.id, 1)} />
              <Tool icon="arrowDown" label={t('editor.layers.down')} disabled={n === list.length - 1} onClick={() => actions.move(x.id, -1)} />
              <Tool icon="copy" label={t('editor.layers.duplicate')} onClick={() => actions.duplicate(x)} />
              <Tool icon="trash" label={t('editor.layers.remove')} danger disabled={x.locked} onClick={() => actions.remove(x.id)} />
            </span>
            <Tool icon={x.locked ? 'lock' : 'unlock'} on={x.locked} label={x.locked ? t('editor.layers.unlock') : t('editor.layers.lock')} onClick={() => actions.patch(x.id, { locked: !x.locked })} />
            <Tool icon={x.hidden ? 'eyeOff' : 'eye'} on={x.hidden} label={x.hidden ? t('editor.layers.show') : t('editor.layers.hide')} onClick={() => actions.patch(x.id, { hidden: !x.hidden })} />
          </div>
        ))}
      </div>
    </section>
  )
}
