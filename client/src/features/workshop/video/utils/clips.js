export const MIN_CLIP = 0.1
const EPS = 1e-6
const NEAR = 1e-3

const trackOf = (project, id) => project.tracks.find((t) => t.clips.some((c) => c.id === id))
const clash = (clips, id, start, end) => clips.some((c) => c.id !== id && start < c.start + c.duration - EPS && end > c.start + EPS)
const swap = (project, track, clips) => ({ ...project, tracks: project.tracks.map((t) => (t === track ? { ...t, clips } : t)) })
const trackEnd = (track) => track.clips.reduce((end, c) => Math.max(end, c.start + c.duration), 0)

export const newId = () => `c_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function newClip({ file, name, url, duration, width = 0, height = 0, start = null, assetId = null }) {
  const label = name != null ? name.slice(0, 60) : file.name.replace(/\.[^.]+$/, '').slice(0, 60)
  return { id: newId(), url, name: label, assetId, width, height, start, in: 0, duration, srcDuration: duration }
}

export const canHost = (track, clip) =>
  track?.kind === 'video' && !track.locked && !clash(track.clips, clip.id, clip.start, clip.start + clip.duration)

export function addClip(project, trackId, clip) {
  const track = project.tracks.find((t) => t.id === trackId)
  if (!track || track.locked) return project
  const wanted = clip.start == null ? trackEnd(track) : Math.max(0, clip.start)
  const start = clash(track.clips, clip.id, wanted, wanted + clip.duration) ? trackEnd(track) : wanted
  return swap(project, track, [...track.clips, { ...clip, start }])
}

export function patchClip(project, id, change, toId) {
  const from = trackOf(project, id)
  if (!from || from.locked) return project
  const clip = from.clips.find((c) => c.id === id)
  const next = { ...clip, ...change }
  const wanted = toId && toId !== from.id ? project.tracks.find((t) => t.id === toId) : null
  const to = wanted && wanted.kind === from.kind && !wanted.locked ? wanted : from
  const valid = next.start >= 0 && next.duration >= MIN_CLIP && next.in >= 0
    && next.in + next.duration <= next.srcDuration + EPS
    && !clash(to.clips, id, next.start, next.start + next.duration)
  if (!valid) return project
  if (to === from) return swap(project, from, from.clips.map((c) => (c.id === id ? next : c)))
  return {
    ...project,
    tracks: project.tracks.map((t) => {
      if (t === from) return { ...t, clips: t.clips.filter((c) => c.id !== id) }
      if (t === to) return { ...t, clips: [...t.clips, next] }
      return t
    }),
  }
}

export function removeClip(project, id) {
  const track = trackOf(project, id)
  if (!track || track.locked) return project
  return swap(project, track, track.clips.filter((c) => c.id !== id))
}

export const canCut = (clip, time) => time > clip.start + MIN_CLIP && time < clip.start + clip.duration - MIN_CLIP

export function rippleClip(project, id) {
  const track = trackOf(project, id)
  if (!track || track.locked) return project
  const clip = track.clips.find((c) => c.id === id)
  const end = clip.start + clip.duration
  const clips = track.clips
    .filter((c) => c.id !== id)
    .map((c) => (c.start >= end - EPS ? { ...c, start: Math.max(0, c.start - clip.duration) } : c))
  return swap(project, track, clips)
}

export function edgeFrom(project, time, dir) {
  let best = null
  const test = (m) => {
    if (dir > 0 ? m <= time + NEAR : m >= time - NEAR) return
    if (best == null || (dir > 0 ? m < best : m > best)) best = m
  }
  test(0)
  for (const track of project.tracks) {
    for (const c of track.clips) {
      test(c.start)
      test(c.start + c.duration)
    }
  }
  return best
}

export function splitClip(project, id, at) {
  const track = trackOf(project, id)
  if (!track || track.locked) return project
  const clip = track.clips.find((c) => c.id === id)
  const head = at - clip.start
  const tail = clip.start + clip.duration - at
  if (head < MIN_CLIP || tail < MIN_CLIP) return project
  const first = { ...clip, duration: head }
  const second = { ...clip, id: newId(), start: at, in: clip.in + head, duration: tail }
  return swap(project, track, track.clips.flatMap((c) => (c.id === id ? [first, second] : [c])))
}

export function activeAt(project, time) {
  for (const track of project.tracks) {
    if (track.kind !== 'video' || track.hidden) continue
    const clip = track.clips.find((c) => time >= c.start && time < c.start + c.duration)
    if (clip) return { clip, track }
  }
  return null
}

export function activeStack(project, time) {
  const out = []
  for (const track of project.tracks) {
    if (track.kind !== 'video' || track.hidden) continue
    const clip = track.clips.find((c) => time >= c.start && time < c.start + c.duration)
    if (clip) out.push({ clip, track })
  }
  return out.reverse()
}

export function snapPoints(project, excludeId, time) {
  const marks = [0, time]
  for (const track of project.tracks) {
    for (const c of track.clips) if (c.id !== excludeId) marks.push(c.start, c.start + c.duration)
  }
  return marks
}
