import { useRef } from 'react'
import { FULL } from './edit.js'

const MIN = 0.03
const ALL = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const CORNERS = ['nw', 'ne', 'se', 'sw']
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const moveRect = (s, dx, dy) => ({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) })

function resizeFree(s, handle, dx, dy) {
  let l = s.x
  let t = s.y
  let r = s.x + s.w
  let b = s.y + s.h
  if (handle.includes('w')) l = clamp(l + dx, 0, r - MIN)
  if (handle.includes('e')) r = clamp(r + dx, l + MIN, 1)
  if (handle.includes('n')) t = clamp(t + dy, 0, b - MIN)
  if (handle.includes('s')) b = clamp(b + dy, t + MIN, 1)
  return { x: l, y: t, w: r - l, h: b - t }
}

function resizeLocked(s, handle, dx, dy, k) {
  const west = handle.includes('w')
  const north = handle.includes('n')
  const ax = west ? s.x + s.w : s.x
  const ay = north ? s.y + s.h : s.y
  const px = clamp((west ? s.x : s.x + s.w) + dx, 0, 1)
  const py = clamp((north ? s.y : s.y + s.h) + dy, 0, 1)
  let w = Math.abs(px - ax)
  let h = Math.abs(py - ay)
  if (w / k > h) h = w / k
  else w = h * k
  const maxW = west ? ax : 1 - ax
  const maxH = north ? ay : 1 - ay
  if (w > maxW) { w = maxW; h = w / k }
  if (h > maxH) { h = maxH; w = h * k }
  if (w < MIN) { w = MIN; h = w / k }
  return { x: west ? ax - w : ax, y: north ? ay - h : ay, w, h }
}

export default function CropOverlay({ rect, size, lock, onChange }) {
  const box = useRef(null)
  const drag = useRef(null)
  const r = rect || FULL
  const k = lock ? (lock * size.h) / size.w : null

  const start = (mode) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const b = box.current.getBoundingClientRect()
    drag.current = { mode, x: e.clientX, y: e.clientY, w: b.width, h: b.height, rect: r }
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.x) / d.w
    const dy = (e.clientY - d.y) / d.h
    if (d.mode === 'move') onChange(moveRect(d.rect, dx, dy))
    else onChange(k ? resizeLocked(d.rect, d.mode, dx, dy, k) : resizeFree(d.rect, d.mode, dx, dy))
  }

  const end = () => { drag.current = null }

  return (
    <div className="ed-crop" ref={box} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <div className="ed-crop-frame" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
        onPointerDown={start('move')}>
        {(k ? CORNERS : ALL).map((h) => <span key={h} className={`ed-handle ed-handle--${h}`} onPointerDown={start(h)} />)}
      </div>
    </div>
  )
}
