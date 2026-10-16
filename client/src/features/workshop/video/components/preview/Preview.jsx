import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '@/shared/ui/Icon.jsx'
import { lookAt } from '../../utils/keyframes.js'
import { formatTime } from '../../utils/project.js'
import { VIDEO_ASSET_MIME } from '@/shared/constants/assetMime.js'
import { hasAsset, hasFiles } from '../../utils/files.js'
import Transformer from './Transformer.jsx'

const DRIFT_PLAYING = 0.25
const DRIFT_PAUSED = 0.02

function Layer({ item, time, playing, z }) {
  const { clip } = item
  const video = useRef(null)
  const target = clip.in + (time - clip.start)
  const latest = useRef({})
  latest.current = { target, playing }
  const look = lookAt(clip, time)

  useEffect(() => {
    const v = video.current
    if (!v) return
    if (playing) {
      if (v.paused) v.play().catch(() => null)
    } else if (!v.paused) {
      v.pause()
    }
  }, [playing, clip.id, clip.url])

  useEffect(() => {
    const v = video.current
    if (!v) return
    const limit = playing ? DRIFT_PLAYING : DRIFT_PAUSED
    if (Math.abs(v.currentTime - target) > limit) v.currentTime = target
  }, [target, playing, clip.id, clip.url])

  const ready = () => {
    const v = video.current
    if (!v) return
    v.currentTime = latest.current.target
    if (latest.current.playing) v.play().catch(() => null)
  }

  return (
    <video ref={video} className="vd-layer" src={clip.url} playsInline preload="auto" onLoadedMetadata={ready}
      style={{
        zIndex: z,
        opacity: look.opacity / 100,
        mixBlendMode: look.blend,
        transform: `translate(${look.x}%, ${look.y}%) rotate(${look.rotation}deg) scale(${look.scale / 100})`,
      }} />
  )
}

export default function Preview({ ratio, time, end, playing, onToggle, onStop, empty, layers, selection, onPatch, onFiles, onAsset, onPick, onMenu }) {
  const { t } = useTranslation()
  const [over, setOver] = useState(false)
  const screen = useRef(null)
  const editable = !playing && Boolean(selection) && !selection.track.locked && layers.some((l) => l.clip.id === selection.clip.id)

  const menu = (e) => {
    e.preventDefault()
    onMenu({ x: e.clientX, y: e.clientY })
  }

  const accepts = (e) => hasFiles(e) || hasAsset(e)
  const dragOver = (e) => {
    if (!empty || !accepts(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }
  const drop = (e) => {
    setOver(false)
    if (!empty || !accepts(e)) return
    e.preventDefault()
    e.stopPropagation()
    const id = e.dataTransfer.getData(VIDEO_ASSET_MIME)
    if (id) onAsset(id, 0)
    else onFiles([...e.dataTransfer.files], 0)
  }

  return (
    <section className="vd-preview" aria-label={t('videoEditor.preview.label')}>
      <div className="vd-stage">
      <div ref={screen} className={'vd-screen' + (empty ? ' is-empty' : '') + (over ? ' is-over' : '')} style={{ '--ar': ratio }}
        onDragOver={dragOver} onDragLeave={() => setOver(false)} onDrop={drop} onContextMenu={menu}>
        {layers.map((item, i) => <Layer key={item.track.id} item={item} time={time} playing={playing} z={i} />)}
        {editable && <Transformer clip={selection.clip} time={time} ratio={ratio} screen={screen} onPatch={onPatch} />}
        {empty && (
          <button type="button" className="vd-screen-hint" onClick={onPick}>
            <Icon name="upload" size={28} />
            <strong>{t('videoEditor.preview.emptyTitle')}</strong>
            <small>{t('videoEditor.preview.emptyText')}</small>
          </button>
        )}
      </div>
      </div>
      <div className="vd-transport" role="group" aria-label={t('videoEditor.preview.label')}>
        <span className="num vd-clock">{formatTime(time)}</span>
        <div className="ed-group">
          <button type="button" className="icon-btn" onClick={onStop} aria-label={t('videoEditor.stop')} data-tip={t('videoEditor.stop')}><Icon name="stop" /></button>
          <button type="button" className="icon-btn" disabled={empty} onClick={onToggle} aria-pressed={playing} aria-label={t('videoEditor.play')} data-tip={t('videoEditor.keys')}><Icon name="play" /></button>
        </div>
        <span className="num vd-clock vd-clock--end">{formatTime(end)}</span>
      </div>
    </section>
  )
}
