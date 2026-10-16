import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, uploadFile } from '../../../api/client.js'
import { useApp } from '../../../app/AppContext.jsx'
import { useDialog } from '../../../app/DialogContext.jsx'
import { useSessionRef, useSessionState } from '../../../app/SessionContext.jsx'
import Button from '../../../components/Button.jsx'
import Dropzone from '../../../components/Dropzone.jsx'
import EmptyState from '../../../components/EmptyState.jsx'
import { FieldError } from '../../../components/Field.jsx'
import Icon from '../../../components/Icon.jsx'
import Resizer from '../../../components/Resizer.jsx'
import Tip from '../../../components/Tip.jsx'
import useResizable from '../../../hooks/useResizable.js'
import { useLibrary } from '../../library/LibraryContext.jsx'
import ExportModal from './components/ExportModal.jsx'
import AddImage from './components/AddImage.jsx'
import ContextMenu from './components/ContextMenu.jsx'
import ImageToolbar from './components/ImageToolbar.jsx'
import LayersPanel from './components/LayersPanel.jsx'
import ShapeMenu from './components/ShapeMenu.jsx'
import Stage from './components/Stage.jsx'
import Inspector from './components/inspector/Inspector.jsx'
import { DEFAULT_AREA, HOME, MAX_ZOOM, MIN_ZOOM, clampZoom, contentBox, drawExport, exportWidth, fitCam, frameOf, initialEdit, makeThumb } from './utils/edit.js'
import { FULL, cropChange, flipImage, loadFonts, newImage, sourceOf, turnImage, uncrop } from './utils/layers.js'
import { loadBitmap } from './utils/source.js'
import useEditor from './hooks/useEditor.js'
import useLayerActions from './hooks/useLayerActions.js'

export default function EditorPanel({ active, onSend, onPreview }) {
  const { t } = useTranslation()
  const { wid } = useApp()
  const dialog = useDialog()
  const { notifyCreated } = useLibrary()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const wanted = params.get('asset')
  const { edit, commit, undo, redo, clear, canUndo, canRedo } = useEditor()
  const [doc, setDoc] = useSessionState('editor.doc', null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [cam, setCam] = useSessionState('editor.cam', HOME)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [section, setSection] = useSessionState('editor.section', 'transform')
  const [previewing, setPreviewing] = useState(false)
  const [selected, setSelected] = useSessionState('editor.selected', null)
  const [crop, setCropState] = useSessionState('editor.crop', null)
  const [fontTick, setFontTick] = useState(0)
  const [original, setOriginal] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [saved, setSaved] = useSessionState('editor.saved', null)
  const [full, setFull] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [snap, setSnap] = useSessionState('editor.snap', true)
  const [copied, setCopied] = useState(false)
  const [menu, setMenu] = useState(null)
  const [fitDismissed, setFitDismissed] = useState(false)
  const select = (id) => {
    setFitDismissed(false)
    setSelected(id)
    setCropState((c) => (c && c.id !== id ? null : c))
  }
  const rzSide = useResizable({ id: 'editor.side', def: 320, min: 260, max: 560, minRest: 500, reverse: true })
  const rzLayers = useResizable({ id: 'editor.layers', def: 280, min: 150, max: 640, minRest: 200, axis: 'y', reverse: true })
  const latest = useRef({})
  const root = useRef(null)
  const hollow = useRef(null)
  const scrim = useRef(null)
  const wasFull = useRef(false)
  const reveal = useRef(null)
  const clip = useSessionRef('editor.clip')
  const canvasMemo = useSessionRef('editor.canvasMemo')
  const getView = () => {
    const { cam: c, box: b } = latest.current
    return { cx: c.cx, cy: c.cy, vw: (b.w || 800) / c.z, vh: (b.h || 600) / c.z }
  }
  const actions = useLayerActions({ commit, getView, onSelect: select, onError: setErr })

  const originalEdit = useMemo(() => (doc ? { layers: [doc.base], canvas: null } : initialEdit), [doc])
  const layer = edit.layers.find((x) => x.id === selected) || null
  latest.current = { doc, dirty: canUndo, saved, layer, actions, cam, box }
  const stageEdit = useMemo(
    () => (crop ? { ...edit, layers: edit.layers.map((l) => (l.id === crop.id ? { ...l, ...uncrop(l) } : l)) } : edit),
    [edit, crop]
  )
  const content = useMemo(() => contentBox(edit.layers), [edit.layers])
  const frame = useMemo(() => frameOf(edit), [edit.layers, edit.canvas])
  const target = layer?.type === 'image' ? layer : null
  const lastImage = useRef(null)
  if (target) lastImage.current = target
  const thumb = useMemo(
    () => (target ? makeThumb(sourceOf(target)) : null),
    [target?.bitmap, target?.flipH, target?.flipV, target?.spin, target?.crop]
  )
  const zoomBy = (f) => setCam((c) => ({ ...c, z: clampZoom(c.z * f) }))
  const fit = () => setCam(fitCam(frame, box))
  latest.current.fit = fit
  latest.current.zoomBy = zoomBy
  const cropActions = {
    start: (l) => setCropState({ id: l.id, rect: l.crop || FULL, ratio: null }),
    set: (change) => setCropState((c) => c && { ...c, ...change }),
    cancel: () => setCropState(null),
    apply: () => {
      const l = latest.current.edit.layers.find((x) => x.id === latest.current.crop?.id)
      if (l) actions.patch(l.id, cropChange(l, latest.current.crop.rect))
      setCropState(null)
    },
  }
  latest.current.crop = crop
  latest.current.edit = edit
  latest.current.cropActions = cropActions
  const setCanvas = (change, key) => commit((e) => ({ ...e, canvas: change === null ? null : { ...e.canvas, ...change } }), key && `canvas:${key}`)
  const enableCanvas = () => {
    if (canvasMemo.current) {
      setCanvas({ ...canvasMemo.current, hidden: false })
      return
    }
    const a = content || DEFAULT_AREA
    setCanvas({ x: Math.round(a.x), y: Math.round(a.y), w: Math.round(a.w), h: Math.round(a.h), bg: null, ratio: null, preset: null, hidden: false })
  }
  const toggleCanvas = () => {
    if (edit.canvas) {
      canvasMemo.current = edit.canvas
      setCanvas(null)
      return
    }
    enableCanvas()
    select(null)
  }
  const revealCanvas = () => {
    if (edit.canvas) setCanvas({ hidden: !edit.canvas.hidden })
  }
  const fitCanvas = () => {
    if (!content) return
    setCanvas({ x: Math.round(content.x), y: Math.round(content.y), w: Math.round(content.w), h: Math.round(content.h), ratio: null, preset: null })
  }
  const canvasActions = { toggle: toggleCanvas, reveal: revealCanvas, fit: fitCanvas }
  const canvasFits = !content || !edit.canvas || ['x', 'y', 'w', 'h'].every((k) => Math.round(edit.canvas[k]) === Math.round(content[k]))
  const showFitHint = Boolean(edit.canvas) && !edit.canvas.hidden && !selected && !crop && !original && !canvasFits && !fitDismissed

  const addFiles = async (files, at, assetId) => {
    if (assetId) {
      try {
        actions.addBitmap(await loadBitmap(wid, assetId), '', at)
      } catch (e) {
        setErr(e.message || t('editor.loadFailed'))
      }
      return
    }
    const images = files.filter((f) => f.type.startsWith('image/'))
    const step = getView().vw * 0.03
    for (const [i, file] of images.entries()) await actions.addImage(file, at && { x: at.x + i * step, y: at.y + i * step })
  }

  const leave = () => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setLeaving(true)
    setFull(false)
  }
  const toggleFull = async () => {
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => null)
      leave()
      return
    }
    setFull(true)
  }
  latest.current.toggleFull = toggleFull
  latest.current.leave = leave

  useEffect(() => {
    const sync = () => { if (!document.fullscreenElement) latest.current.leave() }
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      reveal.current?.cancel()
      if (document.fullscreenElement) document.exitFullscreen().catch(() => null)
    }
  }, [])

  useLayoutEffect(() => {
    if (wasFull.current === full) return
    wasFull.current = full
    const el = root.current
    const r = hollow.current?.getBoundingClientRect()
    reveal.current?.cancel()
    reveal.current = null
    if (el) delete el.dataset.fs
    if (full) setLeaving(false)
    const goNative = () => {
      if (document.fullscreenElement) return
      Promise.resolve(document.documentElement.requestFullscreen?.()).catch(() => null)
    }
    if (!el || !r || !r.width || !r.height || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLeaving(false)
      if (full) goNative()
      return
    }
    const b = el.getBoundingClientRect()
    const k = Math.min(r.width / b.width, r.height / b.height)
    const dx = r.left + r.width / 2 - (b.left + b.width / 2)
    const dy = r.top + r.height / 2 - (b.top + b.height / 2)
    const small = `translate(${dx}px, ${dy}px) scale(${k})`
    const rest = 'translate(0px, 0px) scale(1)'
    const round = `${Math.round(18 / k)}px`
    const lift = '0 40px 120px rgba(0, 0, 0, 0.45)'
    const none = '0 0 0 rgba(0, 0, 0, 0)'
    const from = { transform: small, borderRadius: round, boxShadow: lift, opacity: 0.55 }
    const to = { transform: rest, borderRadius: '0px', boxShadow: none, opacity: 1 }
    el.dataset.fs = full ? 'in' : 'out'
    const opts = full
      ? { duration: 640, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)', fill: 'backwards' }
      : { duration: 420, easing: 'cubic-bezier(0.5, 0, 0.2, 1)', fill: 'forwards' }
    const a = el.animate(full ? [from, { ...to, opacity: 1, offset: 1 }] : [to, from], opts)
    const dim = scrim.current?.animate(full ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }], { ...opts, easing: 'ease-out' })
    reveal.current = a
    a.onfinish = () => {
      if (reveal.current !== a) return
      reveal.current = null
      delete el.dataset.fs
      if (!full) flushSync(() => setLeaving(false))
      a.cancel()
      dim?.cancel()
      if (full) goNative()
    }
  }, [full])

  useEffect(() => {
    if (!active && full) latest.current.toggleFull()
  }, [active])

  latest.current.addFiles = addFiles
  useEffect(() => {
    if (!active) return
    const onPaste = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return
      const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'))
      if (files.length) { e.preventDefault(); latest.current.addFiles(files); return }
      if (clip.current) { e.preventDefault(); latest.current.actions.paste(clip.current) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [active])

  useEffect(() => {
    if (!active) return
    const stop = (e) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) e.preventDefault() }
    window.addEventListener('dragover', stop)
    window.addEventListener('drop', stop)
    return () => { window.removeEventListener('dragover', stop); window.removeEventListener('drop', stop) }
  }, [active])

  const prevDoc = useRef(doc)
  useEffect(() => {
    if (prevDoc.current && prevDoc.current !== doc) prevDoc.current.bitmap.close()
    prevDoc.current = doc
  }, [doc])
  const prevEdit = useRef(edit)
  useEffect(() => {
    if (prevEdit.current === edit) return
    prevEdit.current = edit
    setSaved(null)
  }, [edit])

  const fontKey = edit.layers.filter((l) => l.type === 'text').map((l) => `${l.font}|${l.weight}|${l.text}`).join('\n')
  useEffect(() => {
    let alive = true
    loadFonts(edit.layers).then(() => { if (alive) setFontTick((n) => n + 1) })
    return () => { alive = false }
  }, [fontKey])

  useEffect(() => {
    if (!wanted || latest.current.doc?.asset.id === wanted) return
    let alive = true
    const open = async () => {
      if (latest.current.dirty && !latest.current.saved) {
        const ok = await dialog.confirm({ tone: 'warning', message: t('editor.confirmDiscard'), confirmLabel: t('editor.discard'), danger: true })
        if (!ok) { navigate('/studio/editor', { replace: true }); return }
      }
      setLoading(true)
      setErr('')
      try {
        const asset = await api.get(`/workspaces/${wid}/assets/${wanted}`)
        if (asset.kind !== 'image') throw new Error(t('editor.imageOnly'))
        const bitmap = await loadBitmap(wid, wanted)
        if (!alive) { bitmap.close(); return }
        const base = newImage(bitmap, asset.name || asset.original_name || asset.filename || '', { cx: 0, cy: 0 }, false)
        setDoc({ asset, bitmap, base })
        clear({ layers: [base], canvas: null })
        setCam(fitCam(contentBox([base]), latest.current.box))
        setSaved(null)
        setSelected(base.id)
      } catch (e) {
        if (alive) setErr(e.message || t('editor.loadFailed'))
      } finally {
        if (alive) setLoading(false)
      }
    }
    open()
    return () => { alive = false }
  }, [wanted, wid])

  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const { layer: current, actions: act, fit: fitView, zoomBy: zoom } = latest.current
      if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo()
        else undo()
        return
      }
      if (mod && key === 'y') { e.preventDefault(); redo(); return }
      if (mod && key === '0') { e.preventDefault(); fitView(); return }
      if (mod && (key === '=' || key === '+')) { e.preventDefault(); zoom(1.25); return }
      if (mod && key === '-') { e.preventDefault(); zoom(1 / 1.25); return }
      if (latest.current.crop) {
        if (key === 'escape') latest.current.cropActions.cancel()
        if (key === 'enter') latest.current.cropActions.apply()
        return
      }
      if (!current) return
      if (mod && key === 'c') { e.preventDefault(); clip.current = current; navigator.clipboard?.writeText?.('vinihub').catch(() => null); return }
      if (key === 'escape') { setSelected(null); return }
      if (mod && key === 'd') { e.preventDefault(); act.duplicate(current); return }
      if (current.locked) return
      if (key === '{' || key === '}') { e.preventDefault(); act.place(current.id, key === '}'); return }
      if (key === '[' || key === ']') { e.preventDefault(); act.move(current.id, key === ']' ? 1 : -1); return }
      if (key === 'delete' || key === 'backspace') { e.preventDefault(); act.remove(current.id); return }
      const step = e.shiftKey ? 10 : 1
      const dx = key === 'arrowleft' ? -step : key === 'arrowright' ? step : 0
      const dy = key === 'arrowup' ? -step : key === 'arrowdown' ? step : 0
      if (!dx && !dy) return
      e.preventDefault()
      act.patch(current.id, { x: current.x + dx, y: current.y + dy }, `nudge:${current.id}`)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, undo, redo])

  useEffect(() => {
    if (!canUndo || saved) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [canUndo, saved])

  const tag = doc ? doc.asset.id.slice(0, 8) : 'new'

  const render = async ({ format, quality, scale, target: what }) => {
    const layers = what === 'selection' && layer ? [layer] : edit.layers
    await loadFonts(layers)
    const whole = what !== 'selection' || !layer
    const area = whole ? frame : contentBox(layers)
    if (!area) throw new Error(t('editor.export.empty'))
    const el = document.createElement('canvas')
    drawExport(el, layers, area, exportWidth(area, scale), format === 'jpeg', whole ? edit.canvas?.bg : null)
    const blob = await new Promise((resolve) => el.toBlob(resolve, `image/${format}`, quality))
    if (!blob) throw new Error(t('editor.export.failed'))
    return { blob, width: el.width, height: el.height, ext: blob.type.split('/')[1].replace('jpeg', 'jpg') }
  }

  const save = async (opts) => {
    const { blob, width, height, ext } = await render(opts)
    const file = new File([blob], `edit-${tag}.${ext}`, { type: blob.type })
    const asset = await uploadFile(wid, file, { ...(doc ? { parent_id: doc.asset.id } : {}), meta: JSON.stringify({ width, height }) })
    notifyCreated()
    setSaved(asset)
  }

  const download = async (opts) => {
    const { blob, ext } = await render(opts)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `edit-${tag}.${ext}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  const canCopy = typeof ClipboardItem !== 'undefined' && Boolean(navigator.clipboard?.write)
  const copy = async () => {
    setErr('')
    try {
      const png = render({ format: 'png', quality: 1, scale: 1, target: 'all' }).then((r) => r.blob)
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch (e) {
      setErr(e.message || t('editor.export.failed'))
    }
  }

  const sourceRect = () => {
    const el = root.current?.querySelector('.ed-stage')
    if (!el || !frame || !box.w) return null
    const s = el.getBoundingClientRect()
    const l = s.left + box.w / 2 + (frame.x - cam.cx) * cam.z
    const t = s.top + box.h / 2 + (frame.y - cam.cy) * cam.z
    const left = Math.max(s.left, l)
    const top = Math.max(s.top, t)
    const right = Math.min(s.right, l + frame.w * cam.z)
    const bottom = Math.min(s.bottom, t + frame.h * cam.z)
    if (right - left < 24 || bottom - top < 24) return null
    return { left, top, width: right - left, height: bottom - top }
  }

  const preview = async () => {
    setPreviewing(true)
    setErr('')
    try {
      const { blob, width, height, ext } = await render({ format: 'jpeg', quality: 0.92, scale: Math.min(1, 1600 / frame.w), target: 'all' })
      const from = sourceRect()
      onPreview({
        media: { id: `edit-${Date.now()}`, url: URL.createObjectURL(blob), kind: 'image', name: `edit.${ext}`, w: width, h: height },
        from,
      })
    } catch (e) {
      setErr(e.message || t('editor.export.failed'))
    } finally {
      setPreviewing(false)
    }
  }

  const onPatch = (id, change) => actions.patch(id, change, `transform:${id}`)

  const closeMenu = useCallback(() => setMenu(null), [])
  const openMenu = (m) => {
    if (m.id) select(m.id)
    setMenu(m)
  }

  const menuItems = (id) => {
    const l = id ? edit.layers.find((x) => x.id === id) : null
    const paste = { id: 'paste', icon: 'layers', label: t('editor.menu.paste'), disabled: !clip.current, run: () => clip.current && actions.paste(clip.current) }
    if (!l) return clip.current ? [paste] : []
    const i = edit.layers.indexOf(l)
    const top = i === edit.layers.length - 1
    const bottom = i === 0
    const items = [
      { id: 'copy', icon: 'copy', label: t('editor.menu.copy'), run: () => { clip.current = l; navigator.clipboard?.writeText?.('vinihub').catch(() => null) } },
      paste,
      { id: 'duplicate', icon: 'plus', label: t('editor.layers.duplicate'), run: () => actions.duplicate(l) },
      { id: 'sepA', sep: true },
    ]
    if (l.type === 'image') {
      items.push(
        { id: 'crop', icon: 'crop', label: t('editor.tool.crop'), disabled: l.locked, run: () => cropActions.start(l) },
        { id: 'rotate', icon: 'rotate', label: t('editor.crop.rotateRight'), disabled: l.locked, run: () => actions.patch(l.id, turnImage(l)) },
        { id: 'flipH', icon: 'flip', label: t('editor.crop.flipH'), disabled: l.locked, run: () => actions.patch(l.id, flipImage(l, 'h')) },
        { id: 'flipV', icon: 'flip', label: t('editor.crop.flipV'), disabled: l.locked, run: () => actions.patch(l.id, flipImage(l, 'v')) },
        { id: 'sepB', sep: true }
      )
    }
    items.push(
      { id: 'toFront', icon: 'toFront', label: t('editor.layers.toFront'), disabled: l.locked || top, run: () => actions.place(l.id, true) },
      { id: 'up', icon: 'arrowUp', label: t('editor.layers.up'), disabled: l.locked || top, run: () => actions.move(l.id, 1) },
      { id: 'down', icon: 'arrowDown', label: t('editor.layers.down'), disabled: l.locked || bottom, run: () => actions.move(l.id, -1) },
      { id: 'toBack', icon: 'toBack', label: t('editor.layers.toBack'), disabled: l.locked || bottom, run: () => actions.place(l.id, false) },
      { id: 'sepC', sep: true },
      { id: 'lock', icon: l.locked ? 'unlock' : 'lock', label: l.locked ? t('editor.layers.unlock') : t('editor.layers.lock'), run: () => actions.patch(l.id, { locked: !l.locked }) },
      { id: 'hide', icon: l.hidden ? 'eye' : 'eyeOff', label: l.hidden ? t('editor.layers.show') : t('editor.layers.hide'), run: () => actions.patch(l.id, { hidden: !l.hidden }) },
      { id: 'sepD', sep: true },
      { id: 'remove', icon: 'trash', label: t('editor.layers.remove'), danger: true, disabled: l.locked, run: () => actions.remove(l.id) }
    )
    return items
  }
  const items = menu ? menuItems(menu.id) : []

  return (
    <>
    {(full || leaving) && <div ref={scrim} className="ed-scrim" aria-hidden="true" />}
    <div className={'ed ed-theme' + (full || leaving ? ' is-full' : '')} ref={root}>
      <Tip />
      <header className="ed-bar">
        <div className="ed-brand">
          <span className="ed-brand-ic"><Icon name="edit" size={24} /></span>
          <strong className="ed-name">{t('editor.title')}</strong>
          <span className="num ed-dims">{frame ? `${Math.round(frame.w)} × ${Math.round(frame.h)}` : '– × –'}</span>
        </div>
        <div className="ed-group" role="group">
          <button type="button" className="icon-btn" disabled={!canUndo} onClick={undo} aria-label={t('editor.undo')} data-tip={t('editor.undo')}><Icon name="undo" /></button>
          <button type="button" className="icon-btn" disabled={!canRedo} onClick={redo} aria-label={t('editor.redo')} data-tip={t('editor.redo')}><Icon name="redo" /></button>
          <button type="button" className="icon-btn" disabled={!doc} aria-label={t('editor.compare')} data-tip={t('editor.compare')}
            onPointerDown={() => setOriginal(true)} onPointerUp={() => setOriginal(false)}
            onPointerLeave={() => setOriginal(false)} onPointerCancel={() => setOriginal(false)}><Icon name="eye" /></button>
          <button type="button" className="icon-btn" disabled={!canUndo} aria-label={t('editor.reset')} data-tip={t('editor.reset')}
            onClick={() => commit(() => originalEdit)}><Icon name="refresh" /></button>
        </div>
        {lastImage.current && (
          <ImageToolbar layer={lastImage.current} canvas={edit.canvas} patch={actions.patch} onCrop={() => cropActions.start(lastImage.current)}
            open={layer?.type === 'image'} disabled={lastImage.current.locked || Boolean(crop)} />
        )}
        <div className="ed-group">
          {canCopy && (
            <button type="button" className="icon-btn" disabled={!frame} onClick={copy} aria-label={t('editor.copy')}
              data-tip={copied ? t('editor.copied') : t('editor.copy')}><Icon name={copied ? 'check' : 'copy'} /></button>
          )}
          <button type="button" className="icon-btn" onClick={toggleFull} aria-pressed={full} aria-label={full ? t('editor.fullscreen.exit') : t('editor.fullscreen.enter')}
            data-tip={full ? t('editor.fullscreen.exit') : t('editor.fullscreen.enter')}><Icon name={full ? 'fullscreenExit' : 'fullscreen'} /></button>
          <Button variant="ghost" size="sm" icon="simulator" disabled={previewing || !frame} onClick={preview}>{t('editor.preview')}</Button>
          <Button size="sm" icon="download" disabled={!frame} onClick={() => setExporting(true)}>{t('editor.export.open')}</Button>
        </div>
      </header>
      {err && (
        <div className="ed-saved is-err" role="alert">
          <Icon name="alert" size={16} />
          <strong>{err}</strong>
          <button type="button" className="icon-btn" onClick={() => setErr('')} aria-label={t('common.close')}><Icon name="close" size={14} /></button>
        </div>
      )}
      {saved && (
        <div className="ed-saved" role="status">
          <Icon name="check" size={16} />
          <strong>{t('editor.saved.title')}</strong>
          <Button variant="link" size="sm" onClick={() => { clear(); navigate(`/studio/editor?asset=${saved.id}`) }}>{t('editor.saved.continue')}</Button>
          <Button variant="link" size="sm" onClick={() => onSend('imageRef', saved)}>{t('editor.saved.asReference')}</Button>
          <Button variant="link" size="sm" onClick={() => onSend('videoFrame', saved)}>{t('editor.saved.asFrame')}</Button>
          <button type="button" className="icon-btn" onClick={() => setSaved(null)} aria-label={t('common.close')}><Icon name="close" size={14} /></button>
        </div>
      )}
      <div className="ed-body" ref={rzSide.box} style={{ '--props-w': `${rzSide.width}px` }}>
        <nav className="ed-rail" aria-label={t('editor.tools')}>
          <button type="button" className={'ed-tool' + (edit.canvas ? ' on' : '')} aria-pressed={Boolean(edit.canvas)} data-tip={`${t('editor.rail.canvas')}: ${edit.canvas ? t('editor.canvas.on') : t('editor.canvas.off')}`} aria-label={t('editor.rail.canvas')} onClick={toggleCanvas}>
            <span className="ed-tool-ic"><Icon name="crop" size={18} /></span>
          </button>
          <button type="button" className="ed-tool" data-tip={t('editor.rail.text')} aria-label={t('editor.rail.text')} onClick={() => actions.addText()}>
            <span className="ed-tool-ic"><Icon name="type" size={18} /></span>
          </button>
          <ShapeMenu onPick={actions.addShape} />
          <AddImage onFile={(file) => actions.addImage(file)}>
            {(open) => (
              <button type="button" className="ed-tool" data-tip={t('editor.rail.image')} aria-label={t('editor.rail.image')} onClick={open}>
                <span className="ed-tool-ic"><Icon name="image" size={18} /></span>
              </button>
            )}
          </AddImage>
        </nav>
        <Stage edit={stageEdit} originalEdit={originalEdit} original={original} active={active}
          selected={selected} onSelect={select} onPatch={onPatch} onCanvas={(c) => setCanvas(c, 'frame')} crop={crop} onCrop={(rect) => cropActions.set({ rect })} fontTick={fontTick} cam={cam} setCam={setCam} onBox={setBox} onFiles={addFiles} onMenu={openMenu} snap={snap}>
          {!edit.layers.length && (
            <div className="ed-stage-hint" onPointerDown={(e) => e.stopPropagation()}>
              {loading ? <p className="page-loading">{t('editor.loading')}</p> : (
                <>
                  <strong>{t('editor.emptyTitle')}</strong>
                  <small>{t('editor.emptyText')}</small>
                  <FieldError>{err}</FieldError>
                  <Dropzone accept="image/*" cta={t('editor.upload')} value={null} compact
                    onChange={(a) => a && navigate(`/studio/editor?asset=${a.id}`)} />
                </>
              )}
            </div>
          )}
          {showFitHint && (
            <div className="ed-fitbar" role="group" aria-label={t('editor.canvas.fitHint')} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
              <span>{t('editor.canvas.fitHint')}</span>
              <Button size="sm" icon="expand" onClick={fitCanvas}>{t('editor.canvas.fit')}</Button>
              <button type="button" className="icon-btn" onClick={() => setFitDismissed(true)} aria-label={t('common.close')} data-tip={t('common.close')}><Icon name="close" size={14} /></button>
            </div>
          )}
          {crop && (
            <div className="ed-cropbar" role="group" aria-label={t('editor.tool.crop')} onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.preventDefault()}>
              <Button variant="ghost" size="sm" onClick={cropActions.cancel}>{t('editor.crop.cancel')}<kbd>Esc</kbd></Button>
              <Button size="sm" icon="check" onClick={cropActions.apply}>{t('editor.crop.apply')}<kbd>Enter</kbd></Button>
            </div>
          )}
          <div className="ed-zoom" role="group" aria-label={t('editor.zoom.label')} onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="icon-btn" disabled={cam.z <= MIN_ZOOM} onClick={() => zoomBy(1 / 1.25)} aria-label={t('editor.zoom.out')} title={t('editor.zoom.out')}><Icon name="minus" size={16} /></button>
            <button type="button" className="ed-zoom-val num" onClick={() => setCam((c) => ({ ...c, z: 1 }))} data-tip={t('editor.zoom.reset')}>{Math.round(cam.z * 100)}%</button>
            <button type="button" className="icon-btn" disabled={cam.z >= MAX_ZOOM} onClick={() => zoomBy(1.25)} aria-label={t('editor.zoom.in')} title={t('editor.zoom.in')}><Icon name="plus" size={16} /></button>
            <button type="button" className="icon-btn" aria-pressed={snap} onClick={() => setSnap((v) => !v)} aria-label={snap ? t('editor.snap.on') : t('editor.snap.off')}
              data-tip={snap ? t('editor.snap.on') : t('editor.snap.off')}><Icon name="magnet" size={16} /></button>
            <button type="button" className="icon-btn" disabled={!frame} onClick={fit} aria-label={t('editor.zoom.fit')} data-tip={t('editor.zoom.fit')}><Icon name="expand" size={16} /></button>
          </div>
        </Stage>
        <Resizer rz={rzSide} label={t('common.resize')} />
        <aside className="ed-props" ref={rzLayers.box} style={{ '--layers-h': `${rzLayers.width}px` }}>
          <div className="ed-tool-panel">
            <Inspector layer={layer} actions={actions} thumb={thumb} section={section} setSection={setSection} canvas={edit.canvas} content={content} setCanvas={setCanvas} canvasActions={canvasActions} crop={crop} cropActions={cropActions} frame={frame} />
          </div>
          <Resizer rz={rzLayers} axis="y" label={t('common.resize')} />
          <LayersPanel edit={edit} actions={actions} selected={selected} onSelect={select} onFiles={addFiles} onMenu={openMenu} canvasActions={canvasActions} />
        </aside>
      </div>
      {menu && items.length > 0 && <ContextMenu x={menu.x} y={menu.y} items={items} onClose={closeMenu} />}
      {exporting && <ExportModal hasSelection={Boolean(layer)} measure={(what) => (what === 'selection' && layer ? contentBox([layer]) : frame)} onSave={save} onDownload={download} onClose={() => setExporting(false)} />}
    </div>
    {(full || leaving) && <div ref={hollow} className="ed-hollow" aria-hidden="true" />}
    </>
  )
}
