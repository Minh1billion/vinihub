import { useRef } from 'react'
import { lookAt } from '../../utils/keyframes.js'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const round = (v) => Math.round(v * 10) / 10

export default function Transformer({ clip, time, ratio, screen, onPatch }) {
  const drag = useRef(null)
  const look = lookAt(clip, time)
  const own = clip.width > 0 && clip.height > 0 ? clip.width / clip.height : ratio
  const w = own > ratio ? 1 : own / ratio
  const h = own > ratio ? ratio / own : 1
  const bw = w * look.scale
  const bh = h * look.scale
  const style = {
    left: `${50 + look.x - bw / 2}%`,
    top: `${50 + look.y - bh / 2}%`,
    width: `${bw}%`,
    height: `${bh}%`,
    transform: `rotate(${look.rotation}deg)`,
  }

  const begin = (mode) => (e) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const el = screen.current
    const box = el.getBoundingClientRect()
    const rect = { left: box.left + el.clientLeft, top: box.top + el.clientTop, width: el.clientWidth, height: el.clientHeight }
    const cx = rect.left + rect.width * (0.5 + look.x / 100)
    const cy = rect.top + rect.height * (0.5 + look.y / 100)
    drag.current = {
      mode, rect, cx, cy, look,
      x0: e.clientX,
      y0: e.clientY,
      a0: Math.atan2(e.clientY - cy, e.clientX - cx),
      d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
    }
  }

  const move = (e) => {
    const d = drag.current
    if (!d) return
    e.stopPropagation()
    if (d.mode === 'move') {
      onPatch(clip.id, {
        x: clamp(round(d.look.x + ((e.clientX - d.x0) / d.rect.width) * 100), -100, 100),
        y: clamp(round(d.look.y + ((e.clientY - d.y0) / d.rect.height) * 100), -100, 100),
      })
    } else if (d.mode === 'scale') {
      onPatch(clip.id, { scale: clamp(Math.round((d.look.scale * Math.hypot(e.clientX - d.cx, e.clientY - d.cy)) / d.d0), 10, 300) })
    } else {
      let r = d.look.rotation + ((Math.atan2(e.clientY - d.cy, e.clientX - d.cx) - d.a0) * 180) / Math.PI
      r = ((((r + 180) % 360) + 360) % 360) - 180
      if (e.shiftKey) r = Math.round(r / 15) * 15
      onPatch(clip.id, { rotation: Math.round(r) })
    }
  }

  const end = (e) => {
    e.stopPropagation()
    drag.current = null
  }

  const bind = (mode) => ({ onPointerDown: begin(mode), onPointerMove: move, onPointerUp: end, onPointerCancel: end })

  return (
    <div className="vd-box" style={style} {...bind('move')}>
      <span className="vd-handle vd-handle--rot" {...bind('rotate')} />
      <span className="vd-handle vd-handle--se" {...bind('scale')} />
    </div>
  )
}
