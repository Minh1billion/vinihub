export const LABEL_W = 156
export const MIN_ZOOM = 12
export const MAX_ZOOM = 480
export const DEFAULT_ZOOM = 60

const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300]
const MIN_TICK_PX = 72

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export function tickStep(zoom) {
  return STEPS.find((s) => s * zoom >= MIN_TICK_PX) || STEPS[STEPS.length - 1]
}

export function ticksFor(span, zoom) {
  const step = tickStep(zoom)
  const out = []
  for (let t = 0; t <= span; t += step) out.push(t)
  return out
}
