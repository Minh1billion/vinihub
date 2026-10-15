import { drawLayers } from './layers.js'

export const initialEdit = { layers: [] }

export const MIN_ZOOM = 0.02
export const MAX_ZOOM = 16
export const MAX_EXPORT = 8192

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

function aabb(b) {
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

export function drawExport(canvas, layers, box, outW, opaque = false) {
  const outH = Math.max(1, Math.round((outW * box.h) / box.w))
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (opaque) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, outW, outH)
  }
  const k = outW / box.w
  ctx.scale(k, k)
  ctx.translate(-box.x, -box.y)
  drawLayers(ctx, layers)
}
