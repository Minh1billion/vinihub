import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useLibrary, useLibraryUpload } from '@/features/library'
import { api } from '@/shared/api/client.js'
import { useDialog } from '@/app/providers/DialogContext.jsx'
import { useSessionState } from '@/app/providers/SessionContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Resizer from '@/shared/ui/Resizer.jsx'
import Tip from '@/shared/ui/Tip.jsx'
import useResizable from '@/shared/hooks/useResizable.js'
import ContextMenu from '../shared/controls/ContextMenu.jsx'
import useFullscreen from '../shared/hooks/useFullscreen.js'
import MediaBin from './components/bin/MediaBin.jsx'
import Inspector from './components/inspector/Inspector.jsx'
import Preview from './components/preview/Preview.jsx'
import Timeline from './components/timeline/Timeline.jsx'
import usePlayback from './hooks/usePlayback.js'
import useProject from './hooks/useProject.js'
import useWorkspaceVideos from './hooks/useWorkspaceVideos.js'
import { activeAt, activeStack, canCut, canHost, edgeFrom, newClip, newId } from './utils/clips.js'
import { hasFiles, videoFiles } from './utils/files.js'
import { dropKey, lookAt, setKey } from './utils/keyframes.js'
import { probeVideo } from './utils/probe.js'
import { DEFAULT_LOOK, FPS, MAX_LAYERS, findClip, frameRatio, lookOf, projectEnd, spanOf, videoCount } from './utils/project.js'
import { DEFAULT_ZOOM, clampZoom } from './utils/timeline.js'

const VIDEO_ONLY = ['video']
const POLL_MS = 2000
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export default function VideoPanel({ active }) {
  const { t } = useTranslation()
  const dialog = useDialog()
  const { wid, workspaces, user } = useApp()
  const picker = useRef(null)
  const videos = useWorkspaceVideos({ wid, active })
  const up = useLibraryUpload({ families: VIDEO_ONLY })
  const { notifyCreated } = useLibrary()
  const uploads = useRef(new Map())
  const [exporting, setExporting] = useState(false)
  const { full, shown, toggle: toggleFull, root, hollow, scrim } = useFullscreen({ active, native: false })
  const workspace = workspaces.find((w) => w.id === wid)
  const { project, actions, undo, redo, canUndo, canRedo } = useProject()
  const [zoom, setZoom] = useSessionState('video.zoom', DEFAULT_ZOOM)
  const [snap, setSnap] = useSessionState('video.snap', true)
  const [selected, setSelected] = useState(null)
  const [menu, setMenu] = useState(null)
  const [renaming, setRenaming] = useState(null)
  const board = useRef(null)
  const end = projectEnd(project)
  const span = spanOf(project)
  const { time, playing, seek, toggle, stop } = usePlayback({ end, span })
  const selection = useMemo(() => (selected ? findClip(project, selected) : null), [project, selected])
  const current = useMemo(() => activeAt(project, time), [project, time])
  const layers = useMemo(() => activeStack(project, time), [project, time])
  const ratio = useMemo(() => frameRatio(project), [project])
  const canSplit = Boolean(selection) && !selection.track.locked && canCut(selection.clip, time)
  const rzBin = useResizable({ id: 'video.bin', def: 280, min: 220, max: 420, minRest: 760 })
  const rzProps = useResizable({ id: 'video.props', def: 320, min: 260, max: 520, minRest: 560, reverse: true })
  const topRef = useCallback((el) => { rzBin.box.current = el; rzProps.box.current = el }, [rzBin.box, rzProps.box])
  const rzTimeline = useResizable({ id: 'video.timeline', def: 300, min: 180, max: 640, minRest: 260, axis: 'y', reverse: true })
  const latest = useRef({})
  latest.current = { toggle, undo, redo, selected, time, seek, canSplit }

  const pickTrack = (wanted) => {
    const ok = (tr) => tr?.kind === 'video' && !tr.locked
    const named = project.tracks.find((tr) => tr.id === wanted)
    if (ok(named)) return named.id
    if (ok(selection?.track)) return selection.track.id
    return project.tracks.find(ok)?.id
  }

  const addFiles = async (files, start = 0, wanted) => {
    const videos = videoFiles(files)
    if (!videos.length) {
      if (files.length) dialog.error(t('videoEditor.notVideo'))
      return
    }
    const trackId = pickTrack(wanted)
    if (!trackId) {
      dialog.error(t('videoEditor.timeline.allLocked'))
      return
    }
    let at = start
    for (const file of videos) {
      const url = URL.createObjectURL(file)
      uploads.current.set(url, up.upload([file]).then((done) => done[0]?.id ?? null))
      try {
        const { duration, width, height } = await probeVideo(url)
        actions.add(trackId, newClip({ file, url, duration, width, height, start: at }))
        at = null
      } catch {
        URL.revokeObjectURL(url)
        dialog.error(t('videoEditor.loadFailed'))
      }
    }
  }
  const addAsset = async (asset, start = null, wanted) => {
    const trackId = pickTrack(wanted)
    if (!trackId) {
      dialog.error(t('videoEditor.timeline.allLocked'))
      return
    }
    try {
      const { duration, width, height } = await probeVideo(asset.url)
      actions.add(trackId, newClip({ name: asset.prompt || t('videoEditor.bin.untitled'), url: asset.url, duration, width, height, start, assetId: asset.id }))
    } catch {
      dialog.error(t('videoEditor.loadFailed'))
    }
  }
  const dropAsset = (id, start, wanted) => {
    const asset = videos.assets?.find((a) => a.id === id)
    if (asset) addAsset(asset, start, wanted)
  }
  const patchLook = (id, change) => {
    const found = findClip(project, id)
    if (!found) return
    if (found.clip.keys?.length) {
      const keys = setKey(found.clip, time, change)
      if (keys) actions.patch(id, { keys })
    } else {
      actions.patch(id, change)
    }
  }
  const resetLook = (id) => actions.patch(id, { ...DEFAULT_LOOK, keys: [] })
  const toggleKey = (id) => {
    const found = findClip(project, id)
    if (!found || found.track.locked) return
    const { clip } = found
    const dropped = dropKey(clip, time)
    if (dropped) {
      actions.patch(id, dropped.length ? { keys: dropped } : { ...lookAt(clip, time), keys: [] })
      return
    }
    const keys = setKey(clip, time)
    if (keys) actions.patch(id, { keys })
  }
  const exportVideo = async () => {
    if (exporting) return
    const rows = project.tracks.filter((tr) => tr.kind === 'video')
    const clips = []
    setExporting(true)
    try {
      for (const [index, track] of rows.entries()) {
        if (track.hidden) continue
        for (const clip of track.clips) {
          const assetId = clip.assetId || (await uploads.current.get(clip.url))
          if (!assetId) throw new Error(t('videoEditor.exportWaiting'))
          clips.push({
            asset_id: assetId, start: clip.start, trim_in: clip.in, duration: clip.duration,
            layer: rows.length - 1 - index, ...lookOf(clip),
            keys: (clip.keys || []).map((k) => ({ ...k })),
          })
        }
      }
      if (!clips.length) throw new Error(t('videoEditor.exportEmpty'))
      const { job_id: jobId } = await api.post(`/workspaces/${wid}/exports/video`, { clips })
      for (;;) {
        await wait(POLL_MS)
        const job = await api.get(`/workspaces/${wid}/jobs/${jobId}`)
        if (job.status === 'succeeded') break
        if (job.status === 'failed' || job.status === 'cancelled') throw new Error(job.error || t('videoEditor.exportFailed'))
      }
      notifyCreated()
      dialog.info(t('videoEditor.exportDone'))
    } catch (e) {
      dialog.error(e.message || t('videoEditor.exportFailed'))
    } finally {
      setExporting(false)
    }
  }
  const pick = () => picker.current?.click()
  const remove = () => {
    if (!selected || selection?.track.locked) return
    actions.remove(selected)
    setSelected(null)
  }
  const split = () => {
    if (canSplit) actions.split(selected, time)
  }
  const copy = (id) => {
    const found = findClip(project, id)
    if (found) board.current = { clip: found.clip, kind: found.track.kind }
  }
  const paste = (trackId, at) => {
    const held = board.current
    const track = project.tracks.find((tr) => tr.id === trackId) || project.tracks.find((tr) => tr.kind === held?.kind)
    if (!held || !track || track.locked || track.kind !== held.kind) return
    const id = newId()
    actions.add(track.id, { ...held.clip, id, start: Math.max(0, at) })
    setSelected(id)
  }
  const duplicate = (id) => {
    const found = findClip(project, id)
    if (!found || found.track.locked) return
    const copyId = newId()
    actions.add(found.track.id, { ...found.clip, id: copyId, start: found.clip.start + found.clip.duration })
    setSelected(copyId)
  }
  const ripple = (id) => {
    if (findClip(project, id)?.track.locked) return
    actions.ripple(id)
    if (selected === id) setSelected(null)
  }
  const trim = (id, side) => {
    const found = findClip(project, id)
    if (!found || !canCut(found.clip, time)) return
    const { clip } = found
    if (side === 'start') actions.patch(id, { start: time, in: clip.in + (time - clip.start), duration: clip.duration - (time - clip.start) })
    else actions.patch(id, { duration: time - clip.start })
  }
  Object.assign(latest.current, { remove, split, copy, paste, duplicate, ripple, project, end })

  const closeMenu = useCallback(() => setMenu(null), [])
  const openMenu = (m) => {
    if (m.id) setSelected(m.id)
    setMenu(m)
  }
  const addLayer = () => {
    const top = project.tracks.find((tr) => tr.kind === 'video')
    if (top) actions.addTrack(top.id, 'above')
  }
  const trackItems = (id) => {
    const i = project.tracks.findIndex((tr) => tr.id === id)
    const tr = project.tracks[i]
    if (!tr || tr.kind !== 'video') return []
    const total = videoCount(project)
    const full = total >= MAX_LAYERS
    return [
      { id: 'addAbove', icon: 'toFront', label: t('videoEditor.menu.addAbove'), disabled: full, run: () => actions.addTrack(id, 'above') },
      { id: 'addBelow', icon: 'toBack', label: t('videoEditor.menu.addBelow'), disabled: full, run: () => actions.addTrack(id, 'below') },
      { id: 'dupTrack', icon: 'copy', label: t('videoEditor.menu.duplicateTrack'), disabled: full, run: () => actions.dupTrack(id) },
      { id: 'sepA', sep: true },
      { id: 'up', icon: 'arrowUp', label: t('videoEditor.menu.up'), disabled: project.tracks[i - 1]?.kind !== 'video', run: () => actions.moveTrack(id, -1) },
      { id: 'down', icon: 'arrowDown', label: t('videoEditor.menu.down'), disabled: project.tracks[i + 1]?.kind !== 'video', run: () => actions.moveTrack(id, 1) },
      { id: 'sepB', sep: true },
      { id: 'hide', icon: tr.hidden ? 'eye' : 'eyeOff', label: tr.hidden ? t('videoEditor.menu.show') : t('videoEditor.menu.hide'), run: () => actions.patchTrack(id, { hidden: !tr.hidden }) },
      { id: 'lock', icon: tr.locked ? 'unlock' : 'lock', label: tr.locked ? t('videoEditor.menu.unlock') : t('videoEditor.menu.lock'), run: () => actions.patchTrack(id, { locked: !tr.locked }) },
      { id: 'rename', icon: 'edit', label: t('videoEditor.menu.rename'), run: () => setRenaming(id) },
      { id: 'sepC', sep: true },
      { id: 'removeTrack', icon: 'trash', label: t('videoEditor.menu.removeTrack'), danger: true, disabled: tr.locked || total <= 1,
        run: () => { actions.removeTrack(id); if (selection?.track.id === id) setSelected(null) } },
    ]
  }
  const menuItems = (m) => {
    const found = m.id ? findClip(project, m.id) : null
    const track = project.tracks.find((tr) => tr.id === m.trackId) || project.tracks.find((tr) => tr.kind === 'video')
    const pasteItem = {
      id: 'paste', icon: 'layers', label: t('videoEditor.menu.paste'),
      disabled: !board.current || board.current.kind !== track?.kind || Boolean(track?.locked),
      run: () => paste(track.id, m.at),
    }
    if (!found) return board.current ? [pasteItem] : []
    const id = found.clip.id
    const locked = found.track.locked
    const cut = canCut(found.clip, time) && !locked
    const at = project.tracks.indexOf(found.track)
    const above = project.tracks[at - 1]
    const below = project.tracks[at + 1]
    return [
      { id: 'copy', icon: 'copy', label: t('videoEditor.menu.copy'), run: () => copy(id) },
      pasteItem,
      { id: 'duplicate', icon: 'plus', label: t('videoEditor.menu.duplicate'), disabled: locked, run: () => duplicate(id) },
      { id: 'sepA', sep: true },
      { id: 'split', icon: 'split', label: t('videoEditor.menu.split'), disabled: !cut, run: () => actions.split(id, time) },
      { id: 'trimStart', icon: 'alignL', label: t('videoEditor.menu.trimStart'), disabled: !cut, run: () => trim(id, 'start') },
      { id: 'trimEnd', icon: 'alignR', label: t('videoEditor.menu.trimEnd'), disabled: !cut, run: () => trim(id, 'end') },
      { id: 'sepB', sep: true },
      { id: 'layerUp', icon: 'arrowUp', label: t('videoEditor.menu.layerUp'), disabled: locked || !canHost(above, found.clip), run: () => actions.patch(id, {}, above.id) },
      { id: 'layerDown', icon: 'arrowDown', label: t('videoEditor.menu.layerDown'), disabled: locked || !canHost(below, found.clip), run: () => actions.patch(id, {}, below.id) },
      { id: 'sepC', sep: true },
      { id: 'ripple', icon: 'minus', label: t('videoEditor.menu.ripple'), disabled: locked, run: () => ripple(id) },
      { id: 'remove', icon: 'trash', label: t('videoEditor.menu.delete'), danger: true, disabled: locked, run: () => { actions.remove(id); setSelected(null) } },
    ]
  }
  const items = menu ? (menu.scope === 'track' ? trackItems(menu.trackId) : menuItems(menu)) : []

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(document.activeElement?.tagName)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) latest.current.redo()
        else latest.current.undo()
        return
      }
      if (mod && key === 'y') { e.preventDefault(); latest.current.redo(); return }
      const cur = latest.current
      if (key === ' ') { e.preventDefault(); cur.toggle(); return }
      if (mod && key === 'c') { if (cur.selected) cur.copy(cur.selected); return }
      if (mod && key === 'v') { e.preventDefault(); cur.paste(null, cur.time); return }
      if (mod && key === 'd') { e.preventDefault(); if (cur.selected) cur.duplicate(cur.selected); return }
      if (key === 's' && !mod) { e.preventDefault(); cur.split(); return }
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        if (e.shiftKey && cur.selected) cur.ripple(cur.selected)
        else cur.remove()
        return
      }
      if (key === 'home') { e.preventDefault(); cur.seek(0); return }
      if (key === 'end') { e.preventDefault(); cur.seek(cur.end); return }
      if (key === 'arrowup' || key === 'arrowdown') {
        e.preventDefault()
        const to = edgeFrom(cur.project, cur.time, key === 'arrowup' ? -1 : 1)
        if (to != null) cur.seek(to)
        return
      }
      if (key === 'arrowleft' || key === 'arrowright') {
        e.preventDefault()
        const step = (e.shiftKey ? 10 : 1) / FPS
        cur.seek(cur.time + (key === 'arrowleft' ? -step : step))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  useEffect(() => {
    if (!active) return
    const stopOpen = (e) => { if (hasFiles(e)) e.preventDefault() }
    window.addEventListener('dragover', stopOpen)
    window.addEventListener('drop', stopOpen)
    return () => { window.removeEventListener('dragover', stopOpen); window.removeEventListener('drop', stopOpen) }
  }, [active])

  return (
    <>
    {shown && <div ref={scrim} className="ed-scrim" aria-hidden="true" />}
    <div className={'ed ed-theme vd' + (shown ? ' is-full' : '')} ref={root}>
      <Tip />
      <input ref={picker} type="file" accept="video/*" multiple hidden
        onChange={(e) => { addFiles([...e.target.files], end); e.target.value = '' }} />
      <header className="ed-bar">
        <div className="ed-brand">
          <span className="ed-brand-ic"><Icon name="video" size={24} /></span>
          <strong className="ed-name">{t('videoEditor.title')}</strong>
        </div>
        <div className="ed-group">
          <Button variant="ghost" size="sm" icon="upload" onClick={pick}>{t('videoEditor.import')}</Button>
          <button type="button" className="icon-btn" disabled={!canUndo} onClick={undo} aria-label={t('videoEditor.undo')} data-tip={t('videoEditor.undo')}><Icon name="undo" /></button>
          <button type="button" className="icon-btn" disabled={!canRedo} onClick={redo} aria-label={t('videoEditor.redo')} data-tip={t('videoEditor.redo')}><Icon name="redo" /></button>
          <button type="button" className="icon-btn" onClick={toggleFull} aria-pressed={full}
            aria-label={full ? t('videoEditor.fullscreen.exit') : t('videoEditor.fullscreen.enter')}
            data-tip={full ? t('videoEditor.fullscreen.exit') : t('videoEditor.fullscreen.enter')}><Icon name={full ? 'fullscreenExit' : 'fullscreen'} /></button>
          <Button size="sm" icon="download" disabled={end <= 0} loading={exporting} onClick={exportVideo}>{t('videoEditor.export')}</Button>
        </div>
      </header>
      <div className="vd-main" ref={rzTimeline.box} style={{ '--tl-h': `${rzTimeline.width}px` }}>
        <div className="vd-top" ref={topRef} style={{ '--bin-w': `${rzBin.width}px`, '--props-w': `${rzProps.width}px` }}>
          <MediaBin assets={videos.assets} error={videos.error} onRetry={videos.retry} up={up} workspaceName={workspace?.name}
            userId={user.id} onAdd={(asset) => addAsset(asset)} />
          <Resizer rz={rzBin} label={t('common.resize')} />
          <div className="vd-center">
            <Preview ratio={ratio} time={time} end={end} playing={playing} onToggle={toggle} onStop={stop} empty={end <= 0}
              layers={layers} selection={selection} onPatch={patchLook} onFiles={addFiles} onAsset={dropAsset} onPick={pick}
              onMenu={(m) => openMenu({ ...m, id: current?.clip.id ?? null, trackId: current?.track.id ?? null, at: time })} />
          </div>
          <Resizer rz={rzProps} label={t('common.resize')} />
          <Inspector selection={selection} time={time} onPatch={patchLook} onReset={resetLook} onKey={toggleKey} onSeek={seek} />
        </div>
        <Resizer rz={rzTimeline} axis="y" label={t('common.resize')} />
        <Timeline project={project} time={time} zoom={zoom} onZoom={(z) => setZoom(clampZoom(z))} onSeek={seek}
          selected={selected} onSelect={setSelected} snap={snap} onSnap={setSnap}
          onPatch={actions.patch} onSplit={split} onRemove={remove} onDuplicate={duplicate} onMenu={openMenu} onTrack={actions.patchTrack} onReorder={actions.reorderTrack} onAddLayer={addLayer} renaming={renaming} onRenaming={setRenaming} onDropFiles={addFiles} onDropAsset={dropAsset} canSplit={canSplit} />
      </div>
      {menu && items.length > 0 && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={closeMenu} />}
    </div>
    {shown && <div ref={hollow} className="ed-hollow" aria-hidden="true" />}
    </>
  )
}
