import { initialAdjust, orient, process } from './pixels.js'

const FONT = "'Be Vietnam Pro', system-ui, 'Segoe UI', Roboto, Arial, sans-serif"

export const uid = () => Math.random().toString(36).slice(2, 10)

export const LAYER_TYPES = {
  text: { icon: 'type' },
  image: { icon: 'image' },
}

export const BLEND_OPS = {
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
})

export const newImage = (bitmap, name, view, fit = true) => ({
  ...base('image'), name: name || '', bitmap, x: view.cx, y: view.cy,
  w: Math.max(16, Math.round(fit ? Math.min(bitmap.width, view.vw * 0.5, (view.vh * 0.7 * bitmap.width) / bitmap.height) : bitmap.width)),
  flipH: false, flipV: false, adjust: { ...initialAdjust }, filter: 'none',
})

export const layerName = (layer, empty) => layer.name || (layer.type === 'text' ? layer.text.split('\n')[0] : '') || empty

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
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.font = `${l.weight} ${px}px ${FONT}`
    const lines = (l.text || '').split('\n')
    const lh = px * 1.2
    const width = Math.max(px * 0.5, ...lines.map((x) => ctx.measureText(x).width))
    const height = lh * lines.length
    const cx = l.x
    const cy = l.y
    const pad = px * 0.3
    if (dry) return { cx, cy, w: width + pad * 2, h: height + pad }
    if (l.background) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.fillRect(cx - width / 2 - pad, cy - height / 2 - pad / 2, width + pad * 2, height + pad)
    }
    lines.forEach((line, i) => {
      const y = cy - height / 2 + lh * (i + 0.5)
      if (l.outline) {
        ctx.lineWidth = px * 0.14
        ctx.strokeStyle = 'rgba(0,0,0,0.85)'
        ctx.strokeText(line, cx, y)
      }
      ctx.fillStyle = l.color
      ctx.fillText(line, cx, y)
    })
    return { cx, cy, w: width + pad * 2, h: height + pad }
  },
  image(ctx, l, dry, fast) {
    const o = orient(l.bitmap, 0, l.flipH, l.flipV)
    const pw = Math.max(2, l.w)
    const ph = (pw * o.height) / o.width
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
