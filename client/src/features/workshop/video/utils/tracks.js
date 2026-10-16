import { newId } from './clips.js'
import { MAX_LAYERS, videoCount } from './project.js'

const newTrackId = () => `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

const indexOf = (project, id) => project.tracks.findIndex((t) => t.id === id)

const insertAt = (project, at, track) => ({
  ...project,
  tracks: [...project.tracks.slice(0, at), track, ...project.tracks.slice(at)],
})

export function addTrack(project, refId, where = 'above') {
  const i = indexOf(project, refId)
  const ref = project.tracks[i]
  if (!ref || ref.kind !== 'video' || videoCount(project) >= MAX_LAYERS) return project
  const track = { id: newTrackId(), kind: 'video', name: '', hidden: false, locked: false, clips: [] }
  return insertAt(project, where === 'above' ? i : i + 1, track)
}

export function duplicateTrack(project, id) {
  const i = indexOf(project, id)
  const src = project.tracks[i]
  if (!src || src.kind !== 'video' || videoCount(project) >= MAX_LAYERS) return project
  const copy = { ...src, id: newTrackId(), locked: false, clips: src.clips.map((c) => ({ ...c, id: newId() })) }
  return insertAt(project, i, copy)
}

export function removeTrack(project, id) {
  const src = project.tracks.find((t) => t.id === id)
  if (!src || src.kind !== 'video' || src.locked || videoCount(project) <= 1) return project
  return { ...project, tracks: project.tracks.filter((t) => t.id !== id) }
}

export function moveTrack(project, id, dir) {
  const i = indexOf(project, id)
  const j = i + dir
  const a = project.tracks[i]
  const b = project.tracks[j]
  if (!a || !b || a.kind !== 'video' || b.kind !== 'video') return project
  const tracks = [...project.tracks]
  tracks[i] = b
  tracks[j] = a
  return { ...project, tracks }
}

export function reorderTrack(project, id, toId, after) {
  const from = indexOf(project, id)
  const to = indexOf(project, toId)
  const a = project.tracks[from]
  const b = project.tracks[to]
  if (!a || !b || a.kind !== 'video' || b.kind !== 'video' || id === toId) return project
  const rest = project.tracks.filter((t) => t.id !== id)
  const at = rest.findIndex((t) => t.id === toId) + (after ? 1 : 0)
  if (at === from) return project
  return { ...project, tracks: [...rest.slice(0, at), a, ...rest.slice(at)] }
}

export function patchTrack(project, id, change) {
  if (!project.tracks.some((t) => t.id === id)) return project
  return { ...project, tracks: project.tracks.map((t) => (t.id === id ? { ...t, ...change } : t)) }
}
