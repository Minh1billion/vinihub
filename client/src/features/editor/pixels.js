export const FILTERS = {
  none: '',
  vivid: 'saturate(1.5) contrast(1.1)',
  warm: 'sepia(0.25) saturate(1.2) hue-rotate(-10deg)',
  cool: 'saturate(1.1) hue-rotate(15deg) brightness(1.03)',
  fade: 'contrast(0.88) brightness(1.1) saturate(0.8)',
  mono: 'grayscale(1)',
  noir: 'grayscale(1) contrast(1.35) brightness(0.95)',
  vintage: 'sepia(0.45) contrast(0.92) saturate(0.9)',
}

export const FILTER_KEYS = Object.keys(FILTERS)

export const initialAdjust = { brightness: 0, contrast: 0, saturation: 0, temperature: 0, blur: 0, vignette: 0 }

const oriented = new WeakMap()

export function orient(src, rotate, flipH, flipV) {
  if (!rotate && !flipH && !flipV) return src
  let cache = oriented.get(src)
  if (!cache) {
    cache = new Map()
    oriented.set(src, cache)
  }
  const key = `${rotate}|${flipH}|${flipV}`
  if (cache.has(key)) return cache.get(key)
  const swap = rotate % 180 !== 0
  const w = swap ? src.height : src.width
  const h = swap ? src.width : src.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(w / 2, h / 2)
  ctx.rotate((rotate * Math.PI) / 180)
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1)
  ctx.drawImage(src, -src.width / 2, -src.height / 2)
  cache.set(key, canvas)
  return canvas
}

function filterString(adjust, filter, outW) {
  const parts = [FILTERS[filter]]
  if (adjust.brightness) parts.push(`brightness(${Math.max(0, 1 + adjust.brightness / 100)})`)
  if (adjust.contrast) parts.push(`contrast(${Math.max(0, 1 + adjust.contrast / 100)})`)
  if (adjust.saturation) parts.push(`saturate(${Math.max(0, 1 + adjust.saturation / 100)})`)
  if (adjust.blur) parts.push(`blur(${(adjust.blur / 100) * 0.02 * outW}px)`)
  return parts.filter(Boolean).join(' ') || 'none'
}

function tint(ctx, value, w, h) {
  if (!value) return
  ctx.save()
  ctx.globalCompositeOperation = 'overlay'
  ctx.globalAlpha = (Math.abs(value) / 100) * 0.45
  ctx.fillStyle = value > 0 ? '#ff9a2e' : '#2e7dff'
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function vignette(ctx, value, w, h) {
  if (!value) return
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2)
  g.addColorStop(0, 'rgba(0,0,0,0)')
  g.addColorStop(1, `rgba(0,0,0,${(value / 100) * 0.8})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

export function process(src, w, h, adjust, filter, force = false) {
  const fx = filterString(adjust, filter, w)
  if (fx === 'none' && !adjust.temperature && !adjust.vignette && !force) return src
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.filter = fx
  ctx.drawImage(src, 0, 0, w, h)
  ctx.filter = 'none'
  if (adjust.temperature || adjust.vignette) {
    tint(ctx, adjust.temperature, w, h)
    vignette(ctx, adjust.vignette, w, h)
    ctx.globalCompositeOperation = 'destination-in'
    ctx.drawImage(src, 0, 0, w, h)
  }
  return canvas
}

const cut = new WeakMap()

export function cropped(src, c) {
  const x = Math.min(src.width - 1, Math.max(0, Math.round(c.x * src.width)))
  const y = Math.min(src.height - 1, Math.max(0, Math.round(c.y * src.height)))
  const w = Math.max(1, Math.min(src.width - x, Math.round(c.w * src.width)))
  const h = Math.max(1, Math.min(src.height - y, Math.round(c.h * src.height)))
  let cache = cut.get(src)
  if (!cache) {
    cache = new Map()
    cut.set(src, cache)
  }
  const key = `${x}|${y}|${w}|${h}`
  if (!cache.has(key)) {
    if (cache.size > 6) cache.delete(cache.keys().next().value)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(src, x, y, w, h, 0, 0, w, h)
    cache.set(key, canvas)
  }
  return cache.get(key)
}
