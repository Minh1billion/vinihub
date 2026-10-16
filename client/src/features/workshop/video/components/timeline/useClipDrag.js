import { MIN_CLIP, snapPoints } from '../../utils/clips.js'

const SNAP_PX = 8

export default function useClipDrag({ project, zoom, snap, time, onPatch }) {
  const laneAt = (ev) => document.elementFromPoint(ev.clientX, ev.clientY)?.closest('[data-track]')?.dataset.track
  return (e, clip, mode, locked) => {
    e.stopPropagation()
    if (e.button !== 0 || locked) return
    e.preventDefault()
    const x0 = e.clientX
    const marks = snapPoints(project, clip.id, time)
    const reach = SNAP_PX / zoom
    const near = (value) => {
      if (!snap) return value
      let best = value
      let gap = reach
      for (const m of marks) {
        const d = Math.abs(m - value)
        if (d < gap) { gap = d; best = m }
      }
      return best
    }
    const end0 = clip.start + clip.duration

    const move = (ev) => {
      const dt = (ev.clientX - x0) / zoom
      if (mode === 'move') {
        const raw = clip.start + dt
        const a = near(raw)
        const b = near(raw + clip.duration) - clip.duration
        const start = Math.abs(a - raw) <= Math.abs(b - raw) ? a : b
        onPatch(clip.id, { start: Math.max(0, start) }, laneAt(ev))
        return
      }
      if (mode === 'left') {
        const lo = -Math.min(clip.in, clip.start)
        const hi = clip.duration - MIN_CLIP
        const d = Math.min(hi, Math.max(lo, near(clip.start + dt) - clip.start))
        onPatch(clip.id, { start: clip.start + d, in: clip.in + d, duration: clip.duration - d })
        return
      }
      const hi = clip.srcDuration - clip.in
      const duration = Math.min(hi, Math.max(MIN_CLIP, near(end0 + dt) - clip.start))
      onPatch(clip.id, { duration })
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
}
