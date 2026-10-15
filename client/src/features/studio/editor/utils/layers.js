import { cropped, initialAdjust, orient, process } from './pixels.js'

const FONT = "'Be Vietnam Pro', system-ui, 'Segoe UI', Roboto, Arial, sans-serif"

export const uid = () => Math.random().toString(36).slice(2, 10)

export const FONTS = {
  sans: FONT,
  oswald: "'Oswald', 'Be Vietnam Pro', Impact, sans-serif",
  serif: "'Playfair Display', Georgia, 'Times New Roman', serif",
  mono: "'Roboto Mono', ui-monospace, 'Courier New', monospace",
  script: "'Dancing Script', 'Brush Script MT', cursive",
  display: "'Lobster', 'Be Vietnam Pro', cursive",
}
export const FONT_KEYS = Object.keys(FONTS)

export const loadFonts = (layers) => Promise.all(
  layers.filter((l) => l.type === 'text' && l.font && l.font !== 'sans')
    .map((l) => document.fonts.load(`${l.weight} 32px ${FONTS[l.font].split(',')[0]}`, l.text || 'A').catch(() => null))
)

export const LAYER_TYPES = {
  text: { icon: 'type' },
  image: { icon: 'image' },
  shape: { icon: 'shape' },
}

const BLEND_OPS = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
}
export const BLEND_KEYS = Object.keys(BLEND_OPS)

const base = (type) => ({ id: uid(), type, name: '', x: 0, y: 0, rotation: 0, opacity: 1, blend: 'normal', hidden: false, locked: false })

export const newText = (text, view) => ({
  ...base('text'), text, x: view.cx, y: view.cy, size: Math.max(12, Math.round(view.vh * 0.08)), color: '#ffffff', weight: 700, outline: true, background: false,
  font: 'sans', align: 'center', spacing: 0, lineHeight: 1.2, shadow: false, outlineColor: '#000000', outlineWidth: 14,
})

export const newImage = (bitmap, name, view, fit = true) => ({
  ...base('image'), name: name || '', bitmap, x: view.cx, y: view.cy,
  w: Math.max(16, Math.round(fit ? Math.min(bitmap.width, view.vw * 0.5, (view.vh * 0.7 * bitmap.width) / bitmap.height) : bitmap.width)),
  spin: 0, crop: null, flipH: false, flipV: false, adjust: { ...initialAdjust }, filter: 'none', sy: 1, stretch: false,
})

export const SHAPE_KINDS = ['rect', 'ellipse', 'triangle', 'diamond', 'pentagon', 'hexagon', 'star', 'heart', 'arrow', 'line']

export const SHAPE_ICONS = {
  rect: 'rect', ellipse: 'ellipse', triangle: 'triangle', diamond: 'diamond', pentagon: 'pentagon',
  hexagon: 'hexagon', star: 'star', heart: 'heart', arrow: 'blockArrow', line: 'line',
}

export const SHAPE_COLORS = { fill: '#f3b08a', fill2: '#e68a8a', stroke: '#4a4543' }

export const SHAPE_RATIO = { rect: 0.6, arrow: 0.6 }

export const newShape = (kind, view) => {
  const w = Math.max(24, Math.round(view.vw * (kind === 'line' ? 0.4 : 0.3)))
  return {
    ...base('shape'), kind, x: view.cx, y: view.cy, w, h: Math.round(w * (SHAPE_RATIO[kind] || 1)),
    fill: kind === 'line' ? null : SHAPE_COLORS.fill, gradient: false, fill2: SHAPE_COLORS.fill2, angle: 90,
    stroke: kind === 'line' ? SHAPE_COLORS.fill : SHAPE_COLORS.stroke, strokeWidth: kind === 'line' ? Math.max(4, Math.round(w * 0.03)) : 0, radius: 0,
  }
}

const normalise = (pts) => {
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  const sx = Math.max(...xs) - x0
  const sy = Math.max(...ys) - y0
  return pts.map(([x, y]) => [(x - x0) / sx - 0.5, (y - y0) / sy - 0.5])
}

const regular = (n, start) => normalise(Array.from({ length: n }, (_, i) => {
  const a = ((start + (360 * i) / n) * Math.PI) / 180
  return [Math.cos(a), Math.sin(a)]
}))

const starPoints = normalise(Array.from({ length: 10 }, (_, i) => {
  const a = ((-90 + 36 * i) * Math.PI) / 180
  const r = i % 2 ? 0.42 : 1
  return [Math.cos(a) * r, Math.sin(a) * r]
}))

const poly = (pts) => (ctx, cx, cy, w, h) => {
  pts.forEach(([x, y], i) => ctx[i ? 'lineTo' : 'moveTo'](cx + x * w, cy + y * h))
  ctx.closePath()
}

const heartPath = (ctx, cx, cy, w, h) => {
  const p = (x, y) => [cx + x * w, cy + y * h]
  ctx.moveTo(...p(0, -0.25))
  ctx.bezierCurveTo(...p(0, -0.62), ...p(-0.5, -0.62), ...p(-0.5, -0.1))
  ctx.bezierCurveTo(...p(-0.5, 0.2), ...p(-0.1, 0.35), ...p(0, 0.5))
  ctx.bezierCurveTo(...p(0.1, 0.35), ...p(0.5, 0.2), ...p(0.5, -0.1))
  ctx.bezierCurveTo(...p(0.5, -0.62), ...p(0, -0.62), ...p(0, -0.25))
  ctx.closePath()
}

const SHAPE_PATHS = {
  triangle: poly([[0, -0.5], [0.5, 0.5], [-0.5, 0.5]]),
  diamond: poly([[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]]),
  pentagon: poly(regular(5, -90)),
  hexagon: poly(regular(6, 0)),
  star: poly(starPoints),
  arrow: poly([[-0.5, -0.18], [0.05, -0.18], [0.05, -0.5], [0.5, 0], [0.05, 0.5], [0.05, 0.18], [-0.5, 0.18]]),
  heart: heartPath,
}

const fillOf = (ctx, l, cx, cy, w, h) => {
  if (!l.gradient) return l.fill
  const a = ((l.angle ?? 90) * Math.PI) / 180
  const c = Math.cos(a)
  const s = Math.sin(a)
  const half = (Math.abs(c) * w + Math.abs(s) * h) / 2
  const g = ctx.createLinearGradient(cx - c * half, cy - s * half, cx + c * half, cy + s * half)
  g.addColorStop(0, l.fill)
  g.addColorStop(1, l.fill2 || l.fill)
  return g
}

export const emptyLabel = (l, t) => (l.type === 'text' ? t('editor.text.empty') : l.type === 'shape' ? t(`editor.shape.${l.kind}`) : t('editor.layers.image'))

export const layerName = (layer, empty) => layer.name || (layer.type === 'text' ? layer.text.split('\n')[0] : '') || empty

export const FULL = { x: 0, y: 0, w: 1, h: 1 }

export const orientedOf = (l) => orient(l.bitmap, l.spin || 0, l.flipH, l.flipV)

export const sourceOf = (l) => {
  const o = orientedOf(l)
  return l.crop ? cropped(o, l.crop) : o
}

export const naturalWidth = (l) => sourceOf(l).width

export const skewOf = (l) => l.sy ?? 1

export function fitImage(l, mode, frame) {
  const o = sourceOf(l)
  const base = { rotation: 0, x: frame.x + frame.w / 2, y: frame.y + frame.h / 2 }
  if (mode === 'fill') return { ...base, w: frame.w, sy: (frame.h / frame.w) * (o.width / o.height), stretch: true }
  const k = (mode === 'cover' ? Math.max : Math.min)(frame.w / o.width, frame.h / o.height)
  return { ...base, w: o.width * k, sy: 1, stretch: false }
}

export const handlesOf = (l) => {
  if (l.type === 'text') return ['nw', 'ne', 'se', 'sw']
  if (l.type === 'shape' && l.kind === 'line') return ['w', 'e']
  return ['nw', 'ne', 'se', 'sw', 'n', 'e', 's', 'w']
}

export function resizePatch(l, dir, next) {
  const corner = dir.length === 2
  if (l.type === 'text') return { size: Math.min(20000, Math.max(4, l.size * next.kx)) }
  if (l.type === 'shape') return l.kind === 'line' ? { w: l.w * next.kx } : { w: l.w * next.kx, h: l.h * next.ky }
  if (corner) return { w: l.w * next.kx }
  if (dir === 'n' || dir === 's') return { sy: skewOf(l) * next.ky, stretch: true }
  return { w: l.w * next.kx, sy: skewOf(l) / next.kx, stretch: true }
}

const spun = (x, y, deg) => {
  const r = (deg * Math.PI) / 180
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) }
}

export function uncrop(l) {
  const o = orientedOf(l)
  const c = l.crop || FULL
  const s = l.w / (c.w * o.width)
  const W = s * o.width
  const H = s * o.height * skewOf(l)
  const off = spun((0.5 - c.x - c.w / 2) * W, (0.5 - c.y - c.h / 2) * H, l.rotation)
  return { crop: null, w: W, x: l.x + off.x, y: l.y + off.y }
}

export function cropChange(l, rect) {
  const o = orientedOf(l)
  const f = { ...l, ...uncrop(l) }
  const W = f.w
  const H = ((W * o.height) / o.width) * skewOf(f)
  const off = spun((rect.x + rect.w / 2 - 0.5) * W, (rect.y + rect.h / 2 - 0.5) * H, l.rotation)
  const full = rect.w > 0.9995 && rect.h > 0.9995
  return { crop: full ? null : rect, w: full ? W : W * rect.w, x: f.x + off.x, y: f.y + off.y }
}

export function turnImage(l) {
  const o = orientedOf(l)
  const c = l.crop
  const ph = (c ? (l.w * c.h * o.height) / (c.w * o.width) : (l.w * o.height) / o.width) * skewOf(l)
  return { spin: ((l.spin || 0) + 90) % 360, w: ph, sy: 1 / skewOf(l), crop: c ? { x: 1 - (c.y + c.h), y: c.x, w: c.h, h: c.w } : null }
}

export function flipImage(l, axis) {
  const c = l.crop
  const swap = (l.spin || 0) % 180 !== 0
  const real = (axis === 'h') !== swap ? 'flipH' : 'flipV'
  const mirrored = c ? (axis === 'h' ? { ...c, x: 1 - c.x - c.w } : { ...c, y: 1 - c.y - c.h }) : null
  return { [real]: !l[real], crop: mirrored }
}

const processed = new WeakMap()

function artFor(o, l, target, fast) {
  let bw = 64
  while (bw < target) bw *= 2
  bw = Math.max(1, Math.min(bw, o.width, 4096))
  const bh = Math.max(1, Math.round((bw * o.height) / o.width))
  const shrink = Boolean(fast) && bw < o.width && bw >= target
  const key = `${bw}|${l.filter}|${JSON.stringify(l.adjust)}|${shrink ? 1 : 0}`
  let m = processed.get(o)
  if (!m) { m = new Map(); processed.set(o, m) }
  if (!m.has(key)) {
    if (m.size > 8) m.delete(m.keys().next().value)
    m.set(key, process(o, bw, bh, l.adjust, l.filter, shrink))
  }
  return m.get(key)
}

const DRAWERS = {
  text(ctx, l, dry) {
    const px = Math.max(4, l.size)
    const align = l.align || 'center'
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.font = `${l.weight} ${px}px ${FONTS[l.font] || FONT}`
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${(px * (l.spacing || 0)) / 100}px`
    const lines = (l.text || '').split('\n')
    const lh = px * (l.lineHeight || 1.2)
    const width = Math.max(px * 0.5, ...lines.map((x) => ctx.measureText(x).width))
    const height = lh * lines.length
    const cx = l.x
    const cy = l.y
    const pad = px * 0.3
    if (dry) return { cx, cy, w: width + pad * 2, h: height + pad }
    const ax = align === 'left' ? cx - width / 2 : align === 'right' ? cx + width / 2 : cx
    if (l.background) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(cx - width / 2 - pad, cy - height / 2 - pad / 2, width + pad * 2, height + pad)
    }
    if (l.shadow) {
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur = px * 0.12
      ctx.shadowOffsetY = px * 0.05
    }
    lines.forEach((line, i) => {
      const y = cy - height / 2 + lh * (i + 0.5)
      if (l.outline) {
        ctx.lineWidth = (px * (l.outlineWidth ?? 14)) / 100
        ctx.strokeStyle = l.outlineColor || 'rgba(0,0,0,0.85)'
        ctx.strokeText(line, ax, y)
      }
      ctx.fillStyle = l.color
      ctx.fillText(line, ax, y)
    })
    return { cx, cy, w: width + pad * 2, h: height + pad }
  },
  shape(ctx, l, dry) {
    const line = l.kind === 'line'
    const sw = Math.max(0, l.strokeWidth || 0)
    const w = Math.max(2, l.w)
    const h = line ? Math.max(2, sw) : Math.max(2, l.h)
    const cx = l.x
    const cy = l.y
    if (dry) return { cx, cy, w, h: line ? Math.max(h, 14) : h }
    const iw = Math.max(1, w - sw)
    const ih = Math.max(1, h - sw)
    ctx.beginPath()
    if (line) {
      ctx.lineCap = 'round'
      ctx.moveTo(cx - w / 2 + sw / 2, cy)
      ctx.lineTo(cx + w / 2 - sw / 2, cy)
    } else if (l.kind === 'ellipse') {
      ctx.ellipse(cx, cy, iw / 2, ih / 2, 0, 0, Math.PI * 2)
    } else if (SHAPE_PATHS[l.kind]) {
      SHAPE_PATHS[l.kind](ctx, cx, cy, iw, ih)
    } else {
      const r = (Math.min(iw, ih) / 2) * ((l.radius || 0) / 100)
      if (ctx.roundRect) ctx.roundRect(cx - iw / 2, cy - ih / 2, iw, ih, r)
      else ctx.rect(cx - iw / 2, cy - ih / 2, iw, ih)
    }
    if (l.fill && !line) {
      ctx.fillStyle = fillOf(ctx, l, cx, cy, iw, ih)
      ctx.fill()
    }
    if (sw > 0 && l.stroke) {
      ctx.lineWidth = sw
      ctx.lineJoin = 'round'
      ctx.strokeStyle = l.stroke
      ctx.stroke()
    }
    return { cx, cy, w, h: line ? Math.max(h, 14) : h }
  },
  image(ctx, l, dry, fast) {
    const o = sourceOf(l)
    const pw = Math.max(2, l.w)
    const ph = ((pw * o.height) / o.width) * skewOf(l)
    const cx = l.x
    const cy = l.y
    if (dry) return { cx, cy, w: pw, h: ph }
    const t = ctx.getTransform()
    const art = artFor(o, l, pw * Math.hypot(t.a, t.b), fast)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(art, cx - pw / 2, cy - ph / 2, pw, ph)
    return { cx, cy, w: pw, h: ph }
  },
}

export function drawLayers(ctx, layers, dry = false, fast = false) {
  const bounds = []
  for (const l of layers) {
    if (l.hidden) continue
    ctx.save()
    ctx.globalAlpha = l.opacity
    ctx.globalCompositeOperation = BLEND_OPS[l.blend] || 'source-over'
    ctx.translate(l.x, l.y)
    ctx.rotate((l.rotation * Math.PI) / 180)
    ctx.translate(-l.x, -l.y)
    const box = DRAWERS[l.type](ctx, l, dry, fast)
    ctx.restore()
    bounds.push({ id: l.id, rot: l.rotation, ...box })
  }
  return bounds
}
