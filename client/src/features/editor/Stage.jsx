import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { drawLayers } from './layers.js'
import { boundsOf, zoomAt } from './edit.js'

const CORNERS = ['nw', 'ne', 'se', 'sw']
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
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

export default function Stage({ edit, originalEdit, original, active, selected, onSelect, onPatch, cam, setCam, onBox, children }) {
  const stage = useRef(null)
  const canvas = useRef(null)
  const drag = useRef(null)
  const live = useRef({})
  const pending = useRef(null)
  const frame = useRef(0)
  const [mode, setMode] = useState('')
  const [space, setSpace] = useState(false)
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
    drawLayers(ctx, view.layers, false, true)
  }, [active, view, cam, box.w, box.h])

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
    const w = toWorld(p)
    const hit = [...bounds].reverse().find((b) => {
      if (layerOf(b.id)?.locked) return false
      const r = (-b.rot * Math.PI) / 180
      const dx = w.x - b.cx
      const dy = w.y - b.cy
      const lx = dx * Math.cos(r) - dy * Math.sin(r)
      const ly = dx * Math.sin(r) + dy * Math.cos(r)
      return Math.abs(lx) <= b.w / 2 && Math.abs(ly) <= b.h / 2
    })
    if (!hit) { onSelect(null); startPan(p); return }
    onSelect(hit.id)
    const layer = layerOf(hit.id)
    drag.current = { kind: 'move', id: hit.id, p, x: layer.x, y: layer.y }
  }

  const grab = (kind) => (e) => {
    e.stopPropagation()
    stage.current.setPointerCapture(e.pointerId)
    const layer = layerOf(selBox.id)
    const w = toWorld(point(e))
    const v = { x: w.x - selBox.cx, y: w.y - selBox.cy }
    drag.current = {
      kind, id: layer.id, start: Math.max(1e-6, Math.hypot(v.x, v.y)), angle: Math.atan2(v.y, v.x),
      rotation: layer.rotation, w: layer.type === 'image' ? layer.w : undefined, size: layer.size,
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
    if (d.kind === 'move') {
      const change = { x: d.x + (p.x - d.p.x) / z, y: d.y + (p.y - d.p.y) / z }
      queue(() => onPatch(d.id, change))
      return
    }
    const w = toWorld(p)
    const v = { x: w.x - selBox.cx, y: w.y - selBox.cy }
    if (d.kind === 'scale') {
      const k = Math.hypot(v.x, v.y) / d.start
      const change = d.w !== undefined ? { w: clamp(d.w * k, 4, 200000) } : { size: clamp(d.size * k, 4, 20000) }
      queue(() => onPatch(d.id, change))
      return
    }
    let rotation = d.rotation + ((Math.atan2(v.y, v.x) - d.angle) * 180) / Math.PI
    if (e.shiftKey) rotation = Math.round(rotation / 15) * 15
    const change = { rotation: Math.round(turn(rotation) * 10) / 10 }
    queue(() => onPatch(d.id, change))
  }

  const up = () => {
    if (frame.current) { cancelAnimationFrame(frame.current); flush() }
    drag.current = null
    setMode('')
  }

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
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <canvas ref={canvas} className="ed-world" style={{ width: box.w, height: box.h }} />
      {!original && sel && (
        <div className={'ed-sel' + (sel.locked ? ' is-locked' : '')}
          style={{
            left: centre.x - (selBox.w * z) / 2, top: centre.y - (selBox.h * z) / 2,
            width: selBox.w * z, height: selBox.h * z, transform: `rotate(${selBox.rot}deg)`,
          }}>
          {!sel.locked && (
            <>
              {CORNERS.map((c) => <i key={c} className={`ed-sh ed-sh--${c}`} onPointerDown={grab('scale')} />)}
              <span className="ed-rline" />
              <i className="ed-sh ed-rot" onPointerDown={grab('rotate')} />
            </>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
