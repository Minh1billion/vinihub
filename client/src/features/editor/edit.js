export const FULL = { x: 0, y: 0, w: 1, h: 1 }

export const initialEdit = {
  rotate: 0,
  flipH: false,
  flipV: false,
  crop: null,
  adjust: { brightness: 0, contrast: 0, saturation: 0, temperature: 0, blur: 0, vignette: 0 },
  filter: 'none',
  texts: [],
}

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

const FONT = "'Be Vietnam Pro', system-ui, 'Segoe UI', Roboto, Arial, sans-serif"

export function ratioValue(key, width, height) {
  if (key === 'free') return null
  if (key === 'orig') return width / height
  const [a, b] = key.split(':').map(Number)
  return a / b
}

export function fitRatio(ratio, width, height) {
  let w = 1
  let h = width / ratio / height
  if (h > 1) {
    h = 1
    w = (ratio * height) / width
  }
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h }
}

export function orient(src, rotate, flipH, flipV) {
  if (!rotate && !flipH && !flipV) return src
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
  return canvas
}

export function rectOf(src, crop) {
  const c = crop || FULL
  const x = Math.min(src.width - 1, Math.max(0, Math.round(c.x * src.width)))
  const y = Math.min(src.height - 1, Math.max(0, Math.round(c.y * src.height)))
  const w = Math.max(1, Math.min(src.width - x, Math.round(c.w * src.width)))
  const h = Math.max(1, Math.min(src.height - y, Math.round(c.h * src.height)))
  return { x, y, w, h }
}

export function makeThumb(src, side = 128) {
  const k = side / Math.max(src.width, src.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(src.width * k))
  canvas.height = Math.max(1, Math.round(src.height * k))
  canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height)
  return canvas
}

function filterString(edit, outW) {
  const a = edit.adjust
  const parts = [FILTERS[edit.filter]]
  if (a.brightness) parts.push(`brightness(${Math.max(0, 1 + a.brightness / 100)})`)
  if (a.contrast) parts.push(`contrast(${Math.max(0, 1 + a.contrast / 100)})`)
  if (a.saturation) parts.push(`saturate(${Math.max(0, 1 + a.saturation / 100)})`)
  if (a.blur) parts.push(`blur(${(a.blur / 100) * 0.02 * outW}px)`)
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

function drawTexts(ctx, texts, w, h) {
  const bounds = []
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineJoin = 'round'
  for (const t of texts) {
    const px = Math.max(4, t.size * h)
    ctx.font = `${t.weight} ${px}px ${FONT}`
    const lines = (t.text || '').split('\n')
    const lh = px * 1.2
    const width = Math.max(px * 0.5, ...lines.map((l) => ctx.measureText(l).width))
    const height = lh * lines.length
    const cx = t.x * w
    const cy = t.y * h
    const pad = px * 0.3
    if (t.background) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(cx - width / 2 - pad, cy - height / 2 - pad / 2, width + pad * 2, height + pad)
    }
    lines.forEach((line, i) => {
      const y = cy - height / 2 + lh * (i + 0.5)
      if (t.outline) {
        ctx.lineWidth = px * 0.14
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'
        ctx.strokeText(line, cx, y)
      }
      ctx.fillStyle = t.color
      ctx.fillText(line, cx, y)
    })
    bounds.push({
      id: t.id,
      x0: (cx - width / 2 - pad) / w,
      y0: (cy - height / 2 - pad / 2) / h,
      x1: (cx + width / 2 + pad) / w,
      y1: (cy + height / 2 + pad / 2) / h,
    })
  }
  return bounds
}

export function drawResult(canvas, src, edit, outW, opaque = false) {
  const r = rectOf(src, edit.crop)
  const outH = Math.max(1, Math.round((outW * r.h) / r.w))
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (opaque) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, outW, outH)
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.filter = filterString(edit, outW)
  ctx.drawImage(src, r.x, r.y, r.w, r.h, 0, 0, outW, outH)
  ctx.filter = 'none'
  tint(ctx, edit.adjust.temperature, outW, outH)
  vignette(ctx, edit.adjust.vignette, outW, outH)
  return { outW, outH, bounds: drawTexts(ctx, edit.texts, outW, outH) }
}
