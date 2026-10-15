import { drawLayers } from './layers.js'

export const initialEdit = { layers: [], canvas: null }

export const RATIOS = ['1:1', '4:5', '3:4', '9:16', '16:9', '4:3']

export const PLATFORM_PRESETS = [
  { key: 'instagram:post', platform: 'instagram', format: 'post', ratio: '4:5', w: 1080, h: 1350 },
  { key: 'instagram:reel', platform: 'instagram', format: 'reel', ratio: '9:16', w: 1080, h: 1920 },
  { key: 'instagram:story', platform: 'instagram', format: 'story', ratio: '9:16', w: 1080, h: 1920 },
  { key: 'facebook:post', platform: 'facebook', format: 'post', ratio: '1:1', w: 1080, h: 1080 },
  { key: 'facebook:reel', platform: 'facebook', format: 'reel', ratio: '9:16', w: 1080, h: 1920 },
  { key: 'facebook:story', platform: 'facebook', format: 'story', ratio: '9:16', w: 1080, h: 1920 },
  { key: 'tiktok:video', platform: 'tiktok', format: 'video', ratio: '9:16', w: 1080, h: 1920 },
  { key: 'threads:post', platform: 'threads', format: 'post', ratio: '4:5', w: 1080, h: 1350 },
  { key: 'youtube:video', platform: 'youtube', format: 'video', ratio: '16:9', w: 1280, h: 720 },
  { key: 'youtube:shorts', platform: 'youtube', format: 'shorts', ratio: '9:16', w: 1080, h: 1920 },
]

export const DEFAULT_AREA = { x: -540, y: -540, w: 1080, h: 1080 }
export const MIN_FRAME = 16

export const ratioOf = (key) => {
  const [a, b] = key.split(':').map(Number)
  return a / b
}

export function fitRect(ratio, area) {
  let w = area.w
  let h = w / ratio
  if (h > area.h) {
    h = area.h
    w = h * ratio
  }
  return { x: Math.round(area.x + (area.w - w) / 2), y: Math.round(area.y + (area.h - h) / 2), w: Math.round(w), h: Math.round(h) }
}

export function resizeFrame(r0, dir, d, ratio) {
  let l = r0.x
  let t = r0.y
  let r = r0.x + r0.w
  let b = r0.y + r0.h
  if (dir.includes('e')) r += d.x
  if (dir.includes('w')) l += d.x
  if (dir.includes('s')) b += d.y
  if (dir.includes('n')) t += d.y
  let w = Math.max(MIN_FRAME, r - l)
  let h = Math.max(MIN_FRAME, b - t)
  if (ratio) {
    if (dir.length === 2) {
      w = Math.max(w, h * ratio)
      h = w / ratio
    } else if (dir === 'e' || dir === 'w') {
      h = w / ratio
    } else {
      w = h * ratio
    }
  }
  const x = dir.includes('w') ? r0.x + r0.w - w : dir.length === 1 && (dir === 'n' || dir === 's') ? r0.x + (r0.w - w) / 2 : r0.x
  const y = dir.includes('n') ? r0.y + r0.h - h : dir.length === 1 && (dir === 'e' || dir === 'w') ? r0.y + (r0.h - h) / 2 : r0.y
  return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

const MIN_SIDE = 4
const MAX_SIDE = 200000

export function resizeBox(box, dir, delta) {
  const sx = dir.includes('e') ? 1 : dir.includes('w') ? -1 : 0
  const sy = dir.includes('s') ? 1 : dir.includes('n') ? -1 : 0
  let w = box.w
  let h = box.h
  if (sx && sy) {
    const dx = sx * box.w
    const dy = sy * box.h
    const k = clamp(1 + (delta.x * dx + delta.y * dy) / (dx * dx + dy * dy), Math.max(MIN_SIDE / box.w, MIN_SIDE / box.h), MAX_SIDE / Math.max(box.w, box.h))
    w = box.w * k
    h = box.h * k
  } else if (sx) {
    w = clamp(box.w + sx * delta.x, MIN_SIDE, MAX_SIDE)
  } else {
    h = clamp(box.h + sy * delta.y, MIN_SIDE, MAX_SIDE)
  }
  const ox = (sx * (w - box.w)) / 2
  const oy = (sy * (h - box.h)) / 2
  const r = (box.rot * Math.PI) / 180
  return {
    w, h, kx: w / box.w, ky: h / box.h,
    cx: box.cx + ox * Math.cos(r) - oy * Math.sin(r),
    cy: box.cy + ox * Math.sin(r) + oy * Math.cos(r),
  }
}

export const frameOf = (edit) => (edit.canvas ? { x: edit.canvas.x, y: edit.canvas.y, w: edit.canvas.w, h: edit.canvas.h } : contentBox(edit.layers))

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 16
const MAX_EXPORT = 8192

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export const HOME = { cx: 0, cy: 0, z: 1 }

export function zoomAt(cam, box, p, factor) {
  const z = clampZoom(cam.z * factor)
  const wx = cam.cx + (p.x - box.w / 2) / cam.z
  const wy = cam.cy + (p.y - box.h / 2) / cam.z
  return { cx: wx - (p.x - box.w / 2) / z, cy: wy - (p.y - box.h / 2) / z, z }
}

export function fitCam(content, box, pad = 72) {
  if (!content || !box.w || !box.h) return HOME
  const z = clampZoom(Math.min((box.w - pad * 2) / content.w, (box.h - pad * 2) / content.h, 1))
  return { cx: content.x + content.w / 2, cy: content.y + content.h / 2, z }
}

let scratch
const measureCtx = () => {
  scratch ||= document.createElement('canvas').getContext('2d')
  return scratch
}

export function aabb(b) {
  const r = (b.rot * Math.PI) / 180
  const c = Math.abs(Math.cos(r))
  const s = Math.abs(Math.sin(r))
  const w = b.w * c + b.h * s
  const h = b.w * s + b.h * c
  return { x: b.cx - w / 2, y: b.cy - h / 2, w, h }
}

export const boundsOf = (layers) => drawLayers(measureCtx(), layers, true)

export function contentBox(layers) {
  const bounds = boundsOf(layers)
  if (!bounds.length) return null
  let l = Infinity
  let t = Infinity
  let r = -Infinity
  let b = -Infinity
  for (const x of bounds.map(aabb)) {
    l = Math.min(l, x.x)
    t = Math.min(t, x.y)
    r = Math.max(r, x.x + x.w)
    b = Math.max(b, x.y + x.h)
  }
  return { x: l, y: t, w: Math.max(1, r - l), h: Math.max(1, b - t) }
}

export function exportWidth(box, scale) {
  const k = Math.min(scale, MAX_EXPORT / Math.max(box.w, box.h))
  return Math.max(1, Math.round(box.w * k))
}

export function makeThumb(src, side = 128) {
  const k = side / Math.max(src.width, src.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(src.width * k))
  canvas.height = Math.max(1, Math.round(src.height * k))
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas
}

export function drawExport(canvas, layers, box, outW, opaque = false, bg = null) {
  const outH = Math.max(1, Math.round((outW * box.h) / box.w))
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (bg || opaque) {
    ctx.fillStyle = bg || '#fff'
    ctx.fillRect(0, 0, outW, outH)
  }
  const k = outW / box.w
  ctx.scale(k, k)
  ctx.translate(-box.x, -box.y)
  drawLayers(ctx, layers)
}
