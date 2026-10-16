import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '@/shared/ui/Icon.jsx'
import { VIDEO_ASSET_MIME } from '@/shared/constants/assetMime.js'
import { hasAsset, hasFiles } from '../../utils/files.js'
import { MAX_LAYERS, formatTick, layerNumber, spanOf, videoCount } from '../../utils/project.js'
import { LABEL_W, MAX_ZOOM, MIN_ZOOM, clampZoom, ticksFor } from '../../utils/timeline.js'
import useClipDrag from './useClipDrag.js'

const FIT_PAD = 16

function NameField({ value, label, onDone }) {
  const cancelled = useRef(false)
  return (
    <input className="vd-label-input" defaultValue={value} maxLength={24} autoFocus aria-label={label}
      onFocus={(e) => e.target.select()}
      onBlur={(e) => onDone(cancelled.current ? null : e.target.value.trim())}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') { cancelled.current = true; e.currentTarget.blur() }
      }} />
  )
}

export default function Timeline({ project, time, zoom, onZoom, onSeek, selected, onSelect, snap, onSnap, onPatch, onSplit, onRemove, onDuplicate, onMenu, onTrack, onReorder, onAddLayer, renaming, onRenaming, onDropFiles, onDropAsset, canSplit }) {
  const { t } = useTranslation()
  const ruler = useRef(null)
  const [over, setOver] = useState(false)
  const [reorder, setReorder] = useState(null)
  const span = spanOf(project)
  const [auto, setAuto] = useState(true)
  const [settled, setSettled] = useState(0)
  const held = useRef(false)
  const scroller = useRef(null)
  const live = useRef({})
  live.current = { zoom, span, auto, onZoom }

  const fitZoom = () => {
    const el = scroller.current
    if (!el) return null
    return clampZoom((el.clientWidth - LABEL_W - FIT_PAD) / live.current.span)
  }
  const manual = (next) => {
    setAuto(false)
    onZoom(next)
  }

  useEffect(() => {
    if (!auto || held.current) return
    const next = fitZoom()
    if (next != null && Math.abs(next - zoom) > 0.01) onZoom(next)
  }, [auto, span, settled])

  useEffect(() => {
    const release = () => {
      if (!held.current) return
      held.current = false
      setSettled((n) => n + 1)
    }
    window.addEventListener('pointerup', release)
    window.addEventListener('pointercancel', release)
    return () => { window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release) }
  }, [])

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (!live.current.auto || held.current) return
      const next = fitZoom()
      if (next != null && Math.abs(next - live.current.zoom) > 0.01) live.current.onZoom(next)
    })
    ro.observe(el)
    const wheel = (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const { zoom: z } = live.current
      const next = clampZoom(z * Math.exp(-e.deltaY * 0.0025))
      if (next === z) return
      const box = el.getBoundingClientRect()
      const x = e.clientX - box.left
      const at = (el.scrollLeft + x - LABEL_W) / z
      setAuto(false)
      live.current.onZoom(next)
      requestAnimationFrame(() => { el.scrollLeft = Math.max(0, at * next + LABEL_W - x) })
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener('wheel', wheel) }
  }, [])
  const width = span * zoom
  const total = videoCount(project)
  const canAddLayer = total < MAX_LAYERS
  const beginDrag = useClipDrag({ project, zoom, snap, time, onPatch })

  const autoName = (track) => {
    if (track.kind === 'audio') return t('videoEditor.timeline.audio')
    const base = t('videoEditor.timeline.video')
    return total > 1 ? `${base} ${layerNumber(project, track.id)}` : base
  }
  const finishRename = (track, text) => {
    onRenaming(null)
    if (text == null) return
    const name = text === autoName(track) ? '' : text
    if (name !== (track.name || '')) onTrack(track.id, { name })
  }

  const seekAt = (e) => onSeek((e.clientX - ruler.current.getBoundingClientRect().left) / zoom)
  const startScrub = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    seekAt(e)
  }
  const moveScrub = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e)
  }

  const startHead = (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    seekAt(e)
  }
  const moveHead = (e) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) seekAt(e)
  }

  const beginReorder = (e, track) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    const moveTo = (ev) => {
      const row = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-row]')
      const id = row?.dataset.row
      if (!row || !id || id === track.id || project.tracks.find((tr) => tr.id === id)?.kind !== 'video') {
        setReorder({ id: track.id, over: null, after: false })
        return
      }
      const box = row.getBoundingClientRect()
      setReorder({ id: track.id, over: id, after: ev.clientY > box.top + box.height / 2 })
    }
    const finish = (ev, commit) => {
      window.removeEventListener('pointermove', moveTo)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      setReorder((cur) => {
        if (commit && cur?.over) onReorder(cur.id, cur.over, cur.after)
        return null
      })
    }
    const up = (ev) => finish(ev, true)
    const cancel = (ev) => finish(ev, false)
    window.addEventListener('pointermove', moveTo)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
    setReorder({ id: track.id, over: null, after: false })
  }

  const timeAt = (e) => Math.max(0, (e.clientX - ruler.current.getBoundingClientRect().left) / zoom)
  const laneMenu = (e, track) => {
    e.preventDefault()
    onMenu({ x: e.clientX, y: e.clientY, id: null, trackId: track.id, at: timeAt(e) })
  }
  const clipMenu = (e, clip, track) => {
    e.preventDefault()
    e.stopPropagation()
    onMenu({ x: e.clientX, y: e.clientY, id: clip.id, trackId: track.id, at: time })
  }
  const trackMenu = (e, track) => {
    e.preventDefault()
    onMenu({ x: e.clientX, y: e.clientY, scope: 'track', trackId: track.id })
  }

  const accepts = (e) => hasFiles(e) || hasAsset(e)
  const dragOver = (e) => {
    if (!accepts(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setOver(true)
  }
  const dragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOver(false)
  }
  const drop = (e) => {
    setOver(false)
    if (!accepts(e)) return
    e.preventDefault()
    e.stopPropagation()
    const start = timeAt(e)
    const lane = e.target.closest?.('[data-track]')?.dataset.track
    const id = e.dataTransfer.getData(VIDEO_ASSET_MIME)
    if (id) onDropAsset(id, start, lane)
    else onDropFiles([...e.dataTransfer.files], start, lane)
  }

  return (
    <section className={'vd-timeline' + (over ? ' is-over' : '')} aria-label={t('videoEditor.timeline.label')}
      onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop}>
      <div className="vd-tl-bar">
        <div className="ed-group">
          <button type="button" className="icon-btn" disabled={!canSplit} onClick={onSplit} aria-label={t('videoEditor.split')} data-tip={t('videoEditor.split')}><Icon name="split" size={16} /></button>
          <button type="button" className="icon-btn" disabled={!selected} onClick={() => onDuplicate(selected)} aria-label={t('videoEditor.duplicate')} data-tip={t('videoEditor.duplicate')}><Icon name="copy" size={16} /></button>
          <button type="button" className="icon-btn" disabled={!selected} onClick={onRemove} aria-label={t('videoEditor.delete')} data-tip={t('videoEditor.delete')}><Icon name="trash" size={16} /></button>
          <button type="button" className="icon-btn" disabled={!canAddLayer} onClick={onAddLayer}
            aria-label={t('videoEditor.addLayer')} data-tip={canAddLayer ? t('videoEditor.addLayer') : t('videoEditor.timeline.maxLayers', { max: MAX_LAYERS })}><Icon name="layers" size={16} /></button>
        </div>
        <div className="ed-group">
          <button type="button" className="icon-btn" aria-pressed={snap} onClick={() => onSnap(!snap)}
            aria-label={snap ? t('videoEditor.snap.on') : t('videoEditor.snap.off')} data-tip={snap ? t('videoEditor.snap.on') : t('videoEditor.snap.off')}><Icon name="magnet" size={16} /></button>
          <button type="button" className="icon-btn" aria-pressed={auto} onClick={() => { setAuto(true); const next = fitZoom(); if (next != null) onZoom(next) }}
            aria-label={t('videoEditor.zoom.fit')} data-tip={t('videoEditor.zoom.fit')}><Icon name="fullscreen" size={16} /></button>
          <button type="button" className="icon-btn" disabled={zoom <= MIN_ZOOM} onClick={() => manual(zoom / 1.25)} aria-label={t('videoEditor.zoom.out')} data-tip={t('videoEditor.zoom.out')}><Icon name="minus" size={16} /></button>
          <button type="button" className="icon-btn" disabled={zoom >= MAX_ZOOM} onClick={() => manual(zoom * 1.25)} aria-label={t('videoEditor.zoom.in')} data-tip={t('videoEditor.zoom.in')}><Icon name="plus" size={16} /></button>
        </div>
      </div>
      <div className="vd-tl-scroll" ref={scroller} onPointerDownCapture={() => { held.current = true }}>
        <div className="vd-tl-canvas" style={{ width: LABEL_W + width, '--label-w': `${LABEL_W}px` }}>
          <div className="vd-row vd-row--ruler">
            <div className="vd-label" />
            <div className="vd-ruler" ref={ruler} style={{ width }} onPointerDown={startScrub} onPointerMove={moveScrub}>
              {ticksFor(span, zoom).map((s) => (
                <span key={s} className="vd-tick num" style={{ left: s * zoom }}>{formatTick(s)}</span>
              ))}
            </div>
          </div>
          {project.tracks.map((track) => (
            <div key={track.id} data-row={track.id}
              className={'vd-row' + (reorder?.id === track.id ? ' is-lifted' : '') + (reorder?.over === track.id ? (reorder.after ? ' is-drop-after' : ' is-drop-before') : '')}>
              <div className="vd-label" onContextMenu={(e) => trackMenu(e, track)}>
                <div className="vd-label-top">
                  {track.kind === 'video' && total > 1 && (
                    <span className="vd-grip" role="presentation" data-tip={t('videoEditor.timeline.drag')} onPointerDown={(e) => beginReorder(e, track)} />
                  )}
                  <Icon name={track.kind === 'audio' ? 'music' : 'video'} size={16} />
                  {renaming === track.id ? (
                    <NameField value={track.name || autoName(track)} label={t('videoEditor.timeline.rename')} onDone={(text) => finishRename(track, text)} />
                  ) : (
                    <span className="vd-label-name" title={track.kind === 'video' ? t('videoEditor.timeline.rename') : undefined}
                      onDoubleClick={() => track.kind === 'video' && onRenaming(track.id)}>{track.name || autoName(track)}</span>
                  )}
                </div>
                {track.kind === 'video' && (
                  <div className="vd-label-tools">
                    <button type="button" className="icon-btn" aria-pressed={Boolean(track.hidden)} onClick={() => onTrack(track.id, { hidden: !track.hidden })}
                      aria-label={track.hidden ? t('videoEditor.timeline.show') : t('videoEditor.timeline.hide')} data-tip={track.hidden ? t('videoEditor.timeline.show') : t('videoEditor.timeline.hide')}>
                      <Icon name={track.hidden ? 'eyeOff' : 'eye'} size={14} />
                    </button>
                    <button type="button" className="icon-btn" aria-pressed={Boolean(track.locked)} onClick={() => onTrack(track.id, { locked: !track.locked })}
                      aria-label={track.locked ? t('videoEditor.timeline.unlock') : t('videoEditor.timeline.lock')} data-tip={track.locked ? t('videoEditor.timeline.unlock') : t('videoEditor.timeline.lock')}>
                      <Icon name={track.locked ? 'lock' : 'unlock'} size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div data-track={track.id} className={'vd-lane vd-lane--' + track.kind + (track.hidden ? ' is-hidden' : '') + (track.locked ? ' is-locked' : '')} style={{ width }}
                onPointerDown={(e) => { if (e.button === 0) onSelect(null) }} onContextMenu={(e) => laneMenu(e, track)}>
                {track.kind === 'video' && !track.clips.length && <span className="vd-lane-hint">{t('videoEditor.timeline.empty')}</span>}
                {track.clips.map((clip) => (
                  <div key={clip.id} className={'vd-clip' + (clip.id === selected ? ' on' : '')}
                    style={{ left: clip.start * zoom, width: Math.max(6, clip.duration * zoom) }}
                    onPointerDown={(e) => { onSelect(clip.id); beginDrag(e, clip, 'move', track.locked) }} onContextMenu={(e) => clipMenu(e, clip, track)}>
                    <span className="vd-trim vd-trim--l" onPointerDown={(e) => { onSelect(clip.id); beginDrag(e, clip, 'left', track.locked) }} />
                    <span className="vd-clip-name">{clip.name}</span>
                    {clip.keys?.map((k) => k.t >= clip.in && k.t <= clip.in + clip.duration && (
                      <span key={k.t} className="vd-key" style={{ left: (k.t - clip.in) * zoom }} aria-hidden="true" />
                    ))}
                    <span className="vd-trim vd-trim--r" onPointerDown={(e) => { onSelect(clip.id); beginDrag(e, clip, 'right', track.locked) }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="vd-playhead" style={{ left: LABEL_W + time * zoom }} aria-hidden="true" />
          <div className="vd-playhead-grip" style={{ left: LABEL_W + time * zoom }} onPointerDown={startHead} onPointerMove={moveHead} />
        </div>
      </div>
    </section>
  )
}
