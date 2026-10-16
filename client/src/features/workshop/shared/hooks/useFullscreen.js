import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function useFullscreen({ active, native = false }) {
  const [full, setFull] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const root = useRef(null)
  const hollow = useRef(null)
  const scrim = useRef(null)
  const wasFull = useRef(false)
  const reveal = useRef(null)
  const latest = useRef({})
  const fullRef = useRef(false)
  fullRef.current = full

  const leave = () => {
    if (!fullRef.current) return
    if (!calm()) setLeaving(true)
    setFull(false)
  }
  const toggle = async () => {
    if (full) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => null)
      leave()
      return
    }
    setFull(true)
  }
  latest.current.toggle = toggle
  latest.current.native = native
  latest.current.leave = leave

  useEffect(() => {
    const sync = () => { if (latest.current.native && !document.fullscreenElement) latest.current.leave() }
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
      if (!latest.current.native || document.fullscreenElement) return
      Promise.resolve(document.documentElement.requestFullscreen?.()).catch(() => null)
    }
    if (!el || !r || !r.width || !r.height || calm()) {
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
    if (active || !fullRef.current) return
    reveal.current?.cancel()
    reveal.current = null
    if (root.current) delete root.current.dataset.fs
    wasFull.current = false
    setLeaving(false)
    setFull(false)
    if (document.fullscreenElement) document.exitFullscreen().catch(() => null)
  }, [active])

  useEffect(() => {
    if (native || !full) return
    const onKey = (e) => {
      if (e.key !== 'Escape' || document.querySelector('.select-pop, .modal')) return
      setTimeout(() => { if (!e.defaultPrevented) latest.current.toggle() }, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [native, full])

  return { full, leaving, shown: full || leaving, toggle, root, hollow, scrim }
}
