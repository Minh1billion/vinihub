import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const SHUTTER = 240
const FLIGHT = 720
const LAND = 520
const SAMPLES = 40
const WAIT = 1400
const POP = 'cubic-bezier(0.34, 1.5, 0.64, 1)'
const TRAILS = [{ delay: 55, opacity: 0.38 }, { delay: 110, opacity: 0.2 }]

const lerp = (a, b, t) => a + (b - a) * t
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)
const place = (r, pad = 0) => ({ left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
const same = (a, b) => a && b && ['left', 'top', 'width', 'height'].every((k) => Math.abs(a[k] - b[k]) < 0.5)

const findTarget = (url) => [...document.querySelectorAll('.sim-stage .sim-media img')].find((img) => img.src === url) || null

function measure(img) {
  const r = img.getBoundingClientRect()
  const panel = img.closest('.panel')
  const lift = panel ? new DOMMatrix(getComputedStyle(panel).transform).m42 : 0
  const k = img.offsetWidth ? r.width / img.offsetWidth : 1
  const radius = (parseFloat(getComputedStyle(img.parentElement).borderRadius) || 0) * k
  return { rect: { left: r.left, top: r.top - lift, width: r.width, height: r.height }, radius }
}

function flight(from, to, radius, opacity) {
  const fx = from.left + from.width / 2
  const fy = from.top + from.height / 2
  const tx = to.left + to.width / 2
  const ty = to.top + to.height / 2
  const dx = tx - fx
  const dy = ty - fy
  const arc = Math.min(180, 40 + Math.hypot(dx, dy) * 0.18)
  const tilt = (dx >= 0 ? 1 : -1) * 6
  const frames = []
  for (let i = 0; i <= SAMPLES; i++) {
    const p = i / SAMPLES
    const e = ease(p)
    const s = Math.sin(Math.PI * p)
    const w = lerp(from.width, to.width, e)
    const h = lerp(from.height, to.height, e)
    const cx = lerp(fx, tx, e)
    const cy = lerp(fy, ty, e) - arc * s
    const frame = {
      offset: p,
      left: `${cx - w / 2}px`,
      top: `${cy - h / 2}px`,
      width: `${w}px`,
      height: `${h}px`,
      borderRadius: `${lerp(0, radius, e)}px`,
      transform: `rotate(${tilt * s}deg) scale(${1 + 0.07 * s})`,
    }
    if (opacity) frame.opacity = opacity * (p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3)
    else frame.boxShadow = `0 ${28 * s}px ${56 * s}px rgba(0,0,0,${0.34 * s})`
    frames.push(frame)
  }
  return frames
}

export default function FlyTransition({ fly, onSwitch, onDone }) {
  const refs = useRef({})
  const trails = useRef([])
  const rings = useRef([])
  const cb = useRef({})
  cb.current = { onSwitch, onDone }
  const F = fly.from

  useEffect(() => {
    const r = refs.current
    let alive = true
    let raf = 0
    let target = null
    const anims = []
    const run = (el, frames, options) => {
      const a = el.animate(frames, options)
      anims.push(a)
      return a.finished
    }

    const waitTarget = () => new Promise((resolve) => {
      const started = performance.now()
      let last = null
      const tick = () => {
        if (!alive) { resolve(null); return }
        const img = findTarget(fly.url)
        if (img && img.complete && img.naturalWidth) {
          const m = measure(img)
          if (m.rect.width > 0 && same(m.rect, last)) { resolve({ img, ...m }); return }
          last = m.rect
        } else {
          last = null
        }
        if (performance.now() - started > WAIT) { resolve(null); return }
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    })

    const play = async () => {
      await Promise.all([
        run(r.scrim, [{ opacity: 0 }, { opacity: 1 }], { duration: SHUTTER, easing: 'ease-out', fill: 'forwards' }),
        run(r.flash, [{ opacity: 0.9 }, { opacity: 0 }], { duration: SHUTTER, easing: 'ease-out', fill: 'forwards' }),
        run(r.brackets, [{ opacity: 0, transform: 'scale(1.12)' }, { opacity: 1, transform: 'scale(1)', offset: 0.45 }, { opacity: 0, transform: 'scale(0.98)' }], { duration: SHUTTER, easing: 'ease-out', fill: 'forwards' }),
        run(r.main, [{ transform: 'scale(1)' }, { transform: 'scale(0.94)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: SHUTTER, easing: 'ease-in-out' }),
      ])
      if (!alive) return
      cb.current.onSwitch()
      const hit = await waitTarget()
      if (!alive) return

      if (!hit) {
        await Promise.all([r.main, ...trails.current].map((el) => run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease-in', fill: 'forwards' })).concat(
          run(r.scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' })
        ))
        if (alive) cb.current.onDone()
        return
      }

      target = hit.img
      target.style.opacity = '0'
      const options = { duration: FLIGHT, easing: 'linear', fill: 'both' }
      await Promise.all([
        run(r.main, flight(F, hit.rect, hit.radius, 0), options),
        ...trails.current.map((el, i) => run(el, flight(F, hit.rect, hit.radius, TRAILS[i].opacity), { ...options, delay: TRAILS[i].delay })),
      ])
      if (!alive) return

      target.style.opacity = ''
      target = null
      for (const el of [r.main, ...trails.current]) el.style.visibility = 'hidden'

      const device = hit.img.closest('.sim-scaled')
      const landing = [
        run(r.scrim, [{ opacity: 1 }, { opacity: 0 }], { duration: 360, easing: 'ease-out', fill: 'forwards' }),
        ...rings.current.map((el, i) => {
          Object.assign(el.style, { left: `${hit.rect.left}px`, top: `${hit.rect.top}px`, width: `${hit.rect.width}px`, height: `${hit.rect.height}px`, borderRadius: `${hit.radius}px` })
          return run(el, [{ opacity: 0.9, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.2)' }], { duration: LAND, delay: i * 110, easing: 'ease-out', fill: 'both' })
        }),
      ]
      if (device) landing.push(run(device, [{ transform: 'scale(1)' }, { transform: 'scale(1.03)', offset: 0.3 }, { transform: 'scale(1)' }], { duration: 520, easing: POP }))
      await Promise.all(landing)
      if (alive) cb.current.onDone()
    }

    play().catch(() => null)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      anims.forEach((a) => a.cancel())
      if (target) target.style.opacity = ''
    }
  }, [fly])

  return createPortal(
    <>
      <div ref={(el) => { refs.current.scrim = el }} className="fly-scrim" />
      {TRAILS.map((t, i) => (
        <img key={i} ref={(el) => { trails.current[i] = el }} className="fly-ghost is-trail" src={fly.url} alt="" draggable="false" style={place(F)} />
      ))}
      <img ref={(el) => { refs.current.main = el }} className="fly-ghost" src={fly.url} alt="" draggable="false" style={place(F)} />
      <div ref={(el) => { refs.current.brackets = el }} className="fly-brackets" style={place(F, 12)}><i /><i /><i /><i /></div>
      <div ref={(el) => { refs.current.flash = el }} className="fly-flash" style={place(F)} />
      {[0, 1].map((i) => <div key={i} ref={(el) => { rings.current[i] = el }} className="fly-ring" />)}
    </>,
    document.body
  )
}
