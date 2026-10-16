import { useMemo } from 'react'
import useHistory from '../../shared/hooks/useHistory.js'
import { addClip, patchClip, removeClip, rippleClip, splitClip } from '../utils/clips.js'
import { initialProject } from '../utils/project.js'
import { addTrack, duplicateTrack, moveTrack, patchTrack, removeTrack, reorderTrack } from '../utils/tracks.js'

export default function useProject() {
  const { present, commit, ...rest } = useHistory({ storeKey: 'video.project', initial: initialProject })
  const actions = useMemo(() => ({
    add: (trackId, clip) => commit((p) => addClip(p, trackId, clip)),
    patch: (id, change, toTrack) => commit((p) => patchClip(p, id, change, toTrack), `clip:${id}`),
    remove: (id) => commit((p) => removeClip(p, id)),
    split: (id, at) => commit((p) => splitClip(p, id, at)),
    ripple: (id) => commit((p) => rippleClip(p, id)),
    addTrack: (ref, where) => commit((p) => addTrack(p, ref, where)),
    dupTrack: (id) => commit((p) => duplicateTrack(p, id)),
    removeTrack: (id) => commit((p) => removeTrack(p, id)),
    moveTrack: (id, dir) => commit((p) => moveTrack(p, id, dir)),
    reorderTrack: (id, toId, after) => commit((p) => reorderTrack(p, id, toId, after)),
    patchTrack: (id, change) => commit((p) => patchTrack(p, id, change)),
  }), [commit])
  return { project: present, actions, ...rest }
}
