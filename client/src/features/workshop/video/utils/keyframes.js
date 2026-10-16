import { FPS, lookOf } from './project.js'

export const KEY_PROPS = ['x', 'y', 'scale', 'rotation', 'opacity']
export const MAX_KEYS = 24
const TOLERANCE = 0.5 / FPS

export const sourceTime = (clip, time) => clip.in + (time - clip.start)

const snapTime = (value) => Math.round(value * FPS) / FPS

const mix = (a, b, k) => a + (b - a) * k

export function lookAt(clip, time) {
  const base = lookOf(clip)
  const keys = clip.keys
  if (!keys?.length) return base
  const t = sourceTime(clip, time)
  const out = { ...base }
  let lo = keys[0]
  let hi = keys[keys.length - 1]
  if (t <= lo.t) hi = lo
  else if (t >= hi.t) lo = hi
  else {
    const at = keys.findIndex((k) => k.t > t)
    lo = keys[at - 1]
    hi = keys[at]
  }
  const k = hi.t === lo.t ? 0 : (t - lo.t) / (hi.t - lo.t)
  for (const p of KEY_PROPS) out[p] = mix(lo[p], hi[p], k)
  return out
}

export const keyIndex = (clip, time) => {
  const t = sourceTime(clip, time)
  return (clip.keys || []).findIndex((k) => Math.abs(k.t - t) <= TOLERANCE)
}

const inside = (clip, time) => time >= clip.start && time <= clip.start + clip.duration

export function setKey(clip, time, change = {}) {
  if (!inside(clip, time)) return null
  const keys = clip.keys || []
  const at = keyIndex(clip, time)
  const values = { ...lookAt(clip, time), ...change }
  const entry = { t: at >= 0 ? keys[at].t : snapTime(sourceTime(clip, time)) }
  for (const p of KEY_PROPS) entry[p] = Math.round(values[p] * 100) / 100
  if (at >= 0) return keys.map((k, i) => (i === at ? entry : k))
  if (keys.length >= MAX_KEYS) return null
  return [...keys, entry].sort((a, b) => a.t - b.t)
}

export function dropKey(clip, time) {
  const at = keyIndex(clip, time)
  if (at < 0) return null
  return (clip.keys || []).filter((_, i) => i !== at)
}

export const keyClipTime = (clip, key) => clip.start + (key.t - clip.in)
