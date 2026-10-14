import { useEffect, useMemo, useRef, useState } from 'react'
import CropOverlay from './CropOverlay.jsx'
import { drawResult, initialEdit, rectOf } from './edit.js'

const PREVIEW_MAX = 1600
const PAD = 32
const clamp01 = (v) => Math.min(1, Math.max(0, v))

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

export default function Stage({ source, oriented, edit, tool, lock, original, active, onSelect, onMoveText, onCrop }) {
  const stage = useRef(null)
  const wrap = useRef(null)
  const canvas = useRef(null)
  const bounds = useRef([])
  const drag = useRef(null)
  const box = useBox(stage)
  const cropping = tool === 'crop' && !original

  const view = useMemo(() => {
    if (original) return { src: source, edit: initialEdit }
    if (cropping) return { src: oriented, edit: { ...edit, crop: null, texts: [] } }
    return { src: oriented, edit }
  }, [original, cropping, source, oriented, edit])

  const rect = rectOf(view.src, view.edit.crop)
  const outW = Math.min(rect.w, PREVIEW_MAX)
  const outH = Math.max(1, Math.round((outW * rect.h) / rect.w))
  const fit = Math.min((box.w - PAD) / outW, (box.h - PAD) / outH, 2)
  const dispW = Math.max(0, Math.floor(outW * fit))
  const dispH = Math.max(0, Math.floor(outH * fit))

  useEffect(() => {
    if (!active) return
    const id = requestAnimationFrame(() => {
      bounds.current = drawResult(canvas.current, view.src, view.edit, outW).bounds
    })
    return () => cancelAnimationFrame(id)
  }, [active, view, outW])

  const point = (e) => {
    const b = wrap.current.getBoundingClientRect()
    return { x: (e.clientX - b.left) / b.width, y: (e.clientY - b.top) / b.height }
  }

  const down = (e) => {
    if (tool !== 'text' || original) return
    const p = point(e)
    const hit = [...bounds.current].reverse().find((b) => p.x >= b.x0 && p.x <= b.x1 && p.y >= b.y0 && p.y <= b.y1)
    if (!hit) { onSelect(null); return }
    onSelect(hit.id)
    const t = edit.texts.find((x) => x.id === hit.id)
    drag.current = { id: hit.id, p, x: t.x, y: t.y }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    const p = point(e)
    onMoveText(d.id, clamp01(d.x + p.x - d.p.x), clamp01(d.y + p.y - d.p.y))
  }

  const up = () => { drag.current = null }

  return (
    <section className="ed-stage" ref={stage}>
      <div className={'ed-canvaswrap' + (tool === 'text' && !original ? ' is-text' : '')} ref={wrap}
        style={{ width: dispW, height: dispH }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <canvas ref={canvas} style={{ width: dispW, height: dispH }} />
        {cropping && <CropOverlay rect={edit.crop} size={{ w: oriented.width, h: oriented.height }} lock={lock} onChange={onCrop} />}
      </div>
    </section>
  )
}
