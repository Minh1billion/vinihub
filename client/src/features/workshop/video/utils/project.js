export const FPS = 30
export const MIN_SPAN = 10
export const TAIL = 5

export const MAX_LAYERS = 4

export const initialProject = {
  tracks: [
    { id: 'v1', kind: 'video', name: '', hidden: false, locked: false, clips: [] },
    { id: 'a1', kind: 'audio', name: '', hidden: false, locked: false, clips: [] },
  ],
}

export const BLENDS = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten']

export const DEFAULT_LOOK = { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100, blend: 'normal' }

export const lookOf = (clip) => ({
  x: clip.x ?? DEFAULT_LOOK.x,
  y: clip.y ?? DEFAULT_LOOK.y,
  scale: clip.scale ?? DEFAULT_LOOK.scale,
  rotation: clip.rotation ?? DEFAULT_LOOK.rotation,
  opacity: clip.opacity ?? DEFAULT_LOOK.opacity,
  blend: clip.blend ?? DEFAULT_LOOK.blend,
})

export const videoCount = (project) => project.tracks.filter((t) => t.kind === 'video').length

export function layerNumber(project, trackId) {
  const videos = project.tracks.filter((t) => t.kind === 'video')
  return videos.length - videos.findIndex((t) => t.id === trackId)
}

export const clipEnd = (clip) => clip.start + clip.duration

export const projectEnd = (project) =>
  project.tracks.reduce((end, track) => track.clips.reduce((e, clip) => Math.max(e, clipEnd(clip)), end), 0)

export const spanOf = (project) => Math.max(MIN_SPAN, Math.ceil(projectEnd(project)) + TAIL)

export const DEFAULT_RATIO = 16 / 9

export function frameRatio(project) {
  let first = null
  for (const track of [...project.tracks].reverse()) {
    if (track.kind !== 'video') continue
    for (const c of track.clips) if (c.width > 0 && c.height > 0 && (!first || c.start < first.start)) first = c
  }
  return first ? first.width / first.height : DEFAULT_RATIO
}

export const findClip = (project, id) => {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === id)
    if (clip) return { clip, track }
  }
  return null
}

const pad = (n, size = 2) => String(n).padStart(size, '0')

export function formatTime(seconds) {
  const total = Math.max(0, seconds)
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  const f = Math.floor((total % 1) * FPS)
  return `${pad(m)}:${pad(s)}:${pad(f)}`
}

export function formatTick(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${pad(s)}`
}
