import { useCallback, useEffect, useRef, useState } from 'react'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const KEY = (id) => `vinihub.layout.${id}`

function load(id, def) {
  try {
    const v = Number(localStorage.getItem(KEY(id)))
    return Number.isFinite(v) && v > 0 ? v : def
  } catch { return def }
}
function save(id, value) {
  try { localStorage.setItem(KEY(id), String(value)) } catch {}
}
const refit = () => window.dispatchEvent(new Event('vh:fit'))
const RESET = 'vh:layout-reset'

export const SIDE_PANEL = { def: 340, min: 280, max: 560, minRest: 420 }

export const resetLayouts = () => window.dispatchEvent(new Event(RESET))

export default function useResizable({ id, def, min, max, minRest = 400, axis = 'x', reverse = false }) {
  const box = useRef(null)
  const drag = useRef(null)
  const latest = useRef(null)
  const [width, setWidth] = useState(() => load(id, def))
  const [active, setActive] = useState(false)

  const vertical = axis === 'y'
  const sign = reverse ? -1 : 1

  const limit = useCallback(() => {
    const total = vertical ? box.current?.clientHeight : box.current?.clientWidth
    if (!total) return max
    return Math.max(min, Math.min(max, total - minRest))
  }, [min, max, minRest, vertical])

  const set = useCallback((value, persist) => {
    const next = clamp(Math.round(value), min, limit())
    latest.current = next
    setWidth(next)
    if (persist) save(id, next)
    refit()
    return next
  }, [id, min, limit])

  useEffect(() => {
    const onResize = () => setWidth((w) => clamp(w, min, limit()))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [min, limit])

  useEffect(() => {
    const onReset = () => {
      try { localStorage.removeItem(KEY(id)) } catch {}
      latest.current = null
      setWidth(clamp(def, min, limit()))
      refit()
    }
    window.addEventListener(RESET, onReset)
    return () => window.removeEventListener(RESET, onReset)
  }, [id, def, min, limit])

  useEffect(() => {
    document.documentElement.classList.toggle('is-resizing', active)
    document.documentElement.classList.toggle('is-resizing-y', active && vertical)
    return () => document.documentElement.classList.remove('is-resizing', 'is-resizing-y')
  }, [active, vertical])

  const handle = (label) => ({
    role: 'separator',
    'aria-orientation': vertical ? 'horizontal' : 'vertical',
    'aria-label': label,
    'aria-valuemin': min,
    'aria-valuemax': max,
    'aria-valuenow': width,
    tabIndex: 0,
    title: label,
    onPointerDown(e) {
      if (e.button !== 0) return
      e.currentTarget.setPointerCapture(e.pointerId)
      drag.current = { x: vertical ? e.clientY : e.clientX, w: width }
      setActive(true)
    },
    onPointerMove(e) {
      if (drag.current) set(drag.current.w + sign * ((vertical ? e.clientY : e.clientX) - drag.current.x), false)
    },
    onPointerUp(e) {
      if (!drag.current) return
      e.currentTarget.releasePointerCapture?.(e.pointerId)
      drag.current = null
      setActive(false)
      if (latest.current != null) save(id, latest.current)
    },
    onPointerCancel() { drag.current = null; setActive(false) },
    onDoubleClick() { set(def, false); try { localStorage.removeItem(KEY(id)) } catch {} },
    onKeyDown(e) {
      const step = e.shiftKey ? 48 : 16
      const moves = vertical ? { ArrowUp: -step * sign, ArrowDown: step * sign } : { ArrowLeft: -step * sign, ArrowRight: step * sign }
      if (e.key in moves) { e.preventDefault(); set(width + moves[e.key], true) }
      else if (e.key === 'Home') { e.preventDefault(); set(min, true) }
      else if (e.key === 'End') { e.preventDefault(); set(max, true) }
      else if (e.key === 'Enter') { e.preventDefault(); set(def, false); try { localStorage.removeItem(KEY(id)) } catch {} }
    },
  })

  return { box, width, active, handle }
}
