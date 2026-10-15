import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Icon from '../../../../components/Icon.jsx'
import { drawLayers, handlesOf, resizePatch } from '../utils/layers.js'
import { ASSET_MIME } from '../utils/source.js'
import { aabb, boundsOf, clamp, ratioOf, resizeBox, resizeFrame, zoomAt } from '../utils/edit.js'

const CORNERS = ['nw', 'ne', 'se', 'sw']
const EDGES = ['n', 'e', 's', 'w']
const SNAP = 6

function snapAxis(mine, targets, thr) {
  let best = null
  for (const m of mine) {
    for (const t of targets) {
      const diff = t - m
      if (Math.abs(diff) <= thr && (!best || Math.abs(diff) < Math.abs(best.diff))) best = { diff, line: t }
    }
  }
  return best
}

const turn = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180

function useBox(ref) {
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    const el = ref.current
    const watch = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }))
    watch.observe(el)
    return () => watch.disconnect()
  }, [ref])
  return box
}

export default function Stage({ edit, originalEdit, original, active, selected, onSelect, onPatch, onCanvas, crop, onCrop, fontTick, cam, setCam, onBox, onFiles, onMenu, snap = true, children }) {
  const { t } = useTranslation()
  const stage = useRef(null)
  const canvas = useRef(null)
  const drag = useRef(null)
  const live = useRef({})
  const pending = useRef(null)
  const frame = useRef(0)
  const [mode, setMode] = useState('')
  const [space, setSpace] = useState(false)
  const [guides, setGuides] = useState(null)
  const [dropping, setDropping] = useState(false)
  const box = useBox(stage)
  const view = original ? originalEdit : edit
  const bounds = useMemo(() => boundsOf(view.layers), [view.layers])
  const selBox = useMemo(() => bounds.find((b) => b.id === selected) || null, [bounds, selected])
  const z = cam.z
  live.current = { cam, box, setCam }

  useEffect(() => { onBox(box) }, [box.w, box.h])

  useEffect(() => {
    const el = stage.current
    const wheel = (e) => {
      e.preventDefault()
      const { cam: c, box: b, setCam: set } = live.current
      const r = el.getBoundingClientRect()
      const unit = e.deltaMode === 1 ? 33 : 1
      const factor = Math.exp(-e.deltaY * unit * (e.ctrlKey ? 0.01 : 0.0015))
      set(zoomAt(c, b, { x: e.clientX - r.left, y: e.clientY - r.top }, factor))
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [])

  useEffect(() => {
    if (!active) return
    const typing = () => /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(document.activeElement?.tagName)
    const down = (e) => { if (e.code === 'Space' && !typing()) { e.preventDefault(); setSpace(true) } }
    const up = (e) => { if (e.code === 'Space') setSpace(false) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); setSpace(false) }
  }, [active])

  useLayoutEffect(() => {
    if (!active || !box.w || !box.h) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const c = canvas.current
    const W = Math.round(box.w * dpr)
    const H = Math.round(box.h * dpr)
    if (c.width !== W) c.width = W
    if (c.height !== H) c.height = H
    const ctx = c.getContext('2d')
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, W, H)
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (box.w / 2 - cam.cx * z), dpr * (box.h / 2 - cam.cy * z))
    const cv = view.canvas
    if (cv?.bg) {
      ctx.fillStyle = cv.bg
      ctx.fillRect(cv.x, cv.y, cv.w, cv.h)
    }
    drawLayers(ctx, view.layers, false, true)
    if (cv && !cv.hidden) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.beginPath()
      ctx.rect(cam.cx - box.w / 2 / z - 1, cam.cy - box.h / 2 / z - 1, box.w / z + 2, box.h / z + 2)
      ctx.rect(cv.x, cv.y, cv.w, cv.h)
      ctx.fill('evenodd')
    }
  }, [active, view, cam, box.w, box.h, fontTick])

  const flush = () => {
    frame.current = 0
    const job = pending.current
    pending.current = null
    if (job) job()
  }
  const queue = (job) => {
    pending.current = job
    if (!frame.current) frame.current = requestAnimationFrame(flush)
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const point = (e) => {
    const b = stage.current.getBoundingClientRect()
    return { x: e.clientX - b.left, y: e.clientY - b.top }
  }
  const toWorld = (p) => ({ x: cam.cx + (p.x - box.w / 2) / z, y: cam.cy + (p.y - box.h / 2) / z })
  const toScreen = (x, y) => ({ x: (x - cam.cx) * z + box.w / 2, y: (y - cam.cy) * z + box.h / 2 })
  const layerOf = (id) => edit.layers.find((x) => x.id === id)
  const hitAt = (p, withLocked = false) => {
    const w = toWorld(p)
    return [...bounds].reverse().find((b) => {
      if (!withLocked && layerOf(b.id)?.locked) return false
      const lp = localOf(w, b)
      return Math.abs(lp.x) <= b.w / 2 && Math.abs(lp.y) <= b.h / 2
    })
  }

  const startPan = (p) => {
    drag.current = { kind: 'pan', p, cx: cam.cx, cy: cam.cy, z }
    setMode('pan')
  }

  const down = (e) => {
    if (original) return
    const p = point(e)
    if (e.button === 1 || space) { e.preventDefault(); stage.current.setPointerCapture(e.pointerId); startPan(p); return }
    if (e.button !== 0) return
    stage.current.setPointerCapture(e.pointerId)
    if (crop) { startPan(p); return }
    const hit = hitAt(p)
    if (!hit) { onSelect(null); startPan(p); return }
    onSelect(hit.id)
    const layer = layerOf(hit.id)
    const targets = { x: [], y: [] }
    if (edit.canvas && !edit.canvas.hidden) {
      const c = edit.canvas
      targets.x.push(c.x, c.x + c.w / 2, c.x + c.w)
      targets.y.push(c.y, c.y + c.h / 2, c.y + c.h)
    }
    for (const b of bounds) {
      if (b.id === hit.id) continue
      const a = aabb(b)
      targets.x.push(a.x, a.x + a.w / 2, a.x + a.w)
      targets.y.push(a.y, a.y + a.h / 2, a.y + a.h)
    }
    const self = aabb(hit)
    drag.current = { kind: 'move', id: hit.id, p, x: layer.x, y: layer.y, aw: self.w, ah: self.h, targets }
  }

  const grabRotate = (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    stage.current.setPointerCapture(e.pointerId)
    const layer = layerOf(selBox.id)
    const w = toWorld(point(e))
    drag.current = { kind: 'rotate', id: layer.id, angle: Math.atan2(w.y - selBox.cy, w.x - selBox.cx), rotation: layer.rotation }
  }

  const grabSize = (dir) => (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    stage.current.setPointerCapture(e.pointerId)
    const layer = layerOf(selBox.id)
    const b = { cx: selBox.cx, cy: selBox.cy, rot: selBox.rot }
    drag.current = { kind: 'resize', dir, id: layer.id, layer: { ...layer }, b, w: selBox.w, h: selBox.h, p: localOf(toWorld(point(e)), b) }
  }

  const grabFrame = (kind, dir) => (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    stage.current.setPointerCapture(e.pointerId)
    drag.current = { kind, dir, p: toWorld(point(e)), r0: { x: edit.canvas.x, y: edit.canvas.y, w: edit.canvas.w, h: edit.canvas.h }, ratio: edit.canvas.ratio ? ratioOf(edit.canvas.ratio) : null }
  }

  const localOf = (w, b) => {
    const r = (-b.rot * Math.PI) / 180
    const dx = w.x - b.cx
    const dy = w.y - b.cy
    return { x: dx * Math.cos(r) - dy * Math.sin(r), y: dx * Math.sin(r) + dy * Math.cos(r) }
  }

  const grabCrop = (kind, dir) => (e) => {
    if (e.button !== 0) return
    e.stopPropagation()
    stage.current.setPointerCapture(e.pointerId)
    const { w: W, h: H, cx, cy, rot } = cropBox
    const r = crop.rect
    drag.current = {
      kind, dir, W, H, b: { cx, cy, rot }, p: localOf(toWorld(point(e)), cropBox),
      r0: { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H }, ratio: crop.ratio ? ratioOf(crop.ratio) : null,
    }
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    const p = point(e)
    if (d.kind === 'pan') {
      queue(() => setCam({ cx: d.cx - (p.x - d.p.x) / d.z, cy: d.cy - (p.y - d.p.y) / d.z, z: d.z }))
      return
    }
    if (d.kind === 'cmove' || d.kind === 'csize') {
      const lp = localOf(toWorld(p), d.b)
      const delta = { x: lp.x - d.p.x, y: lp.y - d.p.y }
      let r = d.r0
      if (d.kind === 'cmove') {
        r = { ...r, x: clamp(r.x + delta.x, 0, d.W - r.w), y: clamp(r.y + delta.y, 0, d.H - r.h) }
      } else {
        r = resizeFrame(d.r0, d.dir, delta, d.ratio)
        if (d.ratio) {
          if (r.x < 0 || r.y < 0 || r.x + r.w > d.W + 0.5 || r.y + r.h > d.H + 0.5) return
        } else {
          const right = Math.min(d.W, r.x + r.w)
          const bottom = Math.min(d.H, r.y + r.h)
          const x = Math.max(0, r.x)
          const y = Math.max(0, r.y)
          r = { x, y, w: right - x, h: bottom - y }
        }
      }
      const rect = { x: r.x / d.W, y: r.y / d.H, w: r.w / d.W, h: r.h / d.H }
      queue(() => onCrop(rect))
      return
    }
    if (d.kind === 'fmove' || d.kind === 'fsize') {
      const w = toWorld(p)
      const delta = { x: w.x - d.p.x, y: w.y - d.p.y }
      const change = d.kind === 'fmove'
        ? { x: Math.round(d.r0.x + delta.x), y: Math.round(d.r0.y + delta.y) }
        : resizeFrame(d.r0, d.dir, delta, d.ratio)
      queue(() => onCanvas(change))
      return
    }
    if (d.kind === 'move') {
      let x = d.x + (p.x - d.p.x) / z
      let y = d.y + (p.y - d.p.y) / z
      let g = null
      if (snap !== e.altKey) {
        const sx = snapAxis([x - d.aw / 2, x, x + d.aw / 2], d.targets.x, SNAP / z)
        const sy = snapAxis([y - d.ah / 2, y, y + d.ah / 2], d.targets.y, SNAP / z)
        if (sx) x += sx.diff
        if (sy) y += sy.diff
        if (sx || sy) g = { x: sx ? sx.line : null, y: sy ? sy.line : null }
      }
      queue(() => { onPatch(d.id, { x, y }); setGuides(g) })
      return
    }
    if (d.kind === 'resize') {
      const lp = localOf(toWorld(p), d.b)
      const next = resizeBox({ ...d.b, w: d.w, h: d.h }, d.dir, { x: lp.x - d.p.x, y: lp.y - d.p.y })
      const change = { ...resizePatch(d.layer, d.dir, next), x: next.cx, y: next.cy }
      queue(() => onPatch(d.id, change))
      return
    }
    const w = toWorld(p)
    const v = { x: w.x - selBox.cx, y: w.y - selBox.cy }
    let rotation = d.rotation + ((Math.atan2(v.y, v.x) - d.angle) * 180) / Math.PI
    if (e.shiftKey) rotation = Math.round(rotation / 15) * 15
    const change = { rotation: Math.round(turn(rotation) * 10) / 10 }
    queue(() => onPatch(d.id, change))
  }

  const hasFiles = (e) => [...e.dataTransfer.types].some((x) => x === 'Files' || x === ASSET_MIME)
  const droppable = (e) => !original && !crop && !e.defaultPrevented && hasFiles(e)
  const dragOver = (e) => {
    if (!droppable(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropping(true)
  }
  const dragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false)
  }
  const drop = (e) => {
    setDropping(false)
    if (!droppable(e)) return
    e.preventDefault()
    onFiles([...e.dataTransfer.files], toWorld(point(e)), e.dataTransfer.getData(ASSET_MIME))
  }

  const up = () => {
    if (frame.current) { cancelAnimationFrame(frame.current); flush() }
    drag.current = null
    setGuides(null)
    setMode('')
  }

  const menu = (e) => {
    if (e.target.closest('.ed-zoom, .ed-stage-hint')) return
    e.preventDefault()
    if (original || crop) return
    const hit = hitAt(point(e), true)
    onMenu({ x: e.clientX, y: e.clientY, id: hit ? hit.id : null })
  }

  const cv = !original && edit.canvas && !edit.canvas.hidden ? edit.canvas : null
  const cvPos = cv && toScreen(cv.x, cv.y)
  const cvEdit = Boolean(cv) && !selected && !crop
  const cropBox = crop ? bounds.find((b) => b.id === crop.id) : null
  const cropPos = cropBox && toScreen(cropBox.cx, cropBox.cy)
  const sel = selBox && layerOf(selBox.id)
  const centre = selBox && toScreen(selBox.cx, selBox.cy)

  let g = 32 * z
  while (g < 16) g *= 2
  while (g >= 64) g /= 2
  const grid = {
    backgroundSize: `${g * 2}px ${g * 2}px`,
    backgroundPosition: `${box.w / 2 - cam.cx * z}px ${box.h / 2 - cam.cy * z}px`,
  }

  return (
    <section className={'ed-stage' + (space || mode === 'pan' ? ' is-pan' : '') + (mode === 'pan' ? ' is-panning' : '')} ref={stage} style={grid}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onContextMenu={menu}
      onDragOver={dragOver} onDragLeave={dragLeave} onDrop={drop}>
      <canvas ref={canvas} className="ed-world" style={{ width: box.w, height: box.h }} />
      {!original && sel && !crop && (
        <div className={'ed-sel' + (sel.locked ? ' is-locked' : '')}
          style={{
            left: centre.x - (selBox.w * z) / 2, top: centre.y - (selBox.h * z) / 2,
            width: selBox.w * z, height: selBox.h * z, transform: `rotate(${selBox.rot}deg)`,
          }}>
          {!sel.locked && (
            <>
              {handlesOf(sel).map((c) => <i key={c} className={`ed-sh ed-sh--${c}`} onPointerDown={grabSize(c)} />)}
              <span className="ed-rline" />
              <i className="ed-sh ed-rot" onPointerDown={grabRotate} />
            </>
          )}
        </div>
      )}
      {cv && (
        <div className={'ed-frame' + (cvEdit ? ' is-edit' : '')}
          style={{ left: cvPos.x, top: cvPos.y, width: cv.w * z, height: cv.h * z }}>
          {cvEdit && (
            <>
              {CORNERS.map((c) => <i key={c} className={`ed-sh ed-sh--${c}`} onPointerDown={grabFrame('fsize', c)} />)}
              {EDGES.map((c) => <i key={c} className={`ed-fe ed-fe--${c}`} onPointerDown={grabFrame('fsize', c)} />)}
              <i className="ed-fgrip" onPointerDown={grabFrame('fmove')} />
            </>
          )}
        </div>
      )}
      {cropBox && (
        <div className="ed-crop" style={{ left: cropPos.x - (cropBox.w * z) / 2, top: cropPos.y - (cropBox.h * z) / 2, width: cropBox.w * z, height: cropBox.h * z, transform: `rotate(${cropBox.rot}deg)` }}>
          <div className="ed-crop-rect" onPointerDown={grabCrop('cmove')}
            style={{ left: `${crop.rect.x * 100}%`, top: `${crop.rect.y * 100}%`, width: `${crop.rect.w * 100}%`, height: `${crop.rect.h * 100}%` }}>
            {CORNERS.map((c) => <i key={c} className={`ed-sh ed-sh--${c}`} onPointerDown={grabCrop('csize', c)} />)}
            {EDGES.map((c) => <i key={c} className={`ed-fe ed-fe--${c}`} onPointerDown={grabCrop('csize', c)} />)}
          </div>
        </div>
      )}
      {guides?.x != null && <i className="ed-guide ed-guide--v" style={{ left: toScreen(guides.x, 0).x }} />}
      {guides?.y != null && <i className="ed-guide ed-guide--h" style={{ top: toScreen(0, guides.y).y }} />}
      {dropping && (
        <div className="ed-drop">
          <Icon name="upload" size={28} />
          <strong>{t('editor.dropHint')}</strong>
        </div>
      )}
      {children}
    </section>
  )
}
