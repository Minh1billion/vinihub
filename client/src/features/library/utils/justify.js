const MIN_RATIO = 0.4
const MAX_RATIO = 3
const IDEAL_W = 140
const MIN_H = 80

export const clampRatio = (value) => Math.min(MAX_RATIO, Math.max(MIN_RATIO, value || 1))

export function ratioOf(asset, measured) {
  const w = asset.meta?.width
  const h = asset.meta?.height
  if (w > 0 && h > 0) return clampRatio(w / h)
  return clampRatio(measured ?? (asset.kind === 'video' ? 16 / 9 : 1))
}

export function masonry(ratios, width, gap) {
  const count = Math.max(1, Math.floor((width + gap) / (IDEAL_W + gap)))
  const w = (width - gap * (count - 1)) / count
  const cols = Array.from({ length: count }, () => ({ top: 0, items: [] }))
  ratios.forEach((r, i) => {
    const col = cols.reduce((a, b) => (b.top < a.top ? b : a))
    const h = Math.max(MIN_H, w / r)
    col.items.push({ i, w, h })
    col.top += h + gap
  })
  return cols.map((c) => c.items)
}
