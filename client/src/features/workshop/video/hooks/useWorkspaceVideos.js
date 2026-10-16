import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/shared/api/client.js'
import { useLibrary } from '@/features/library'

const MAX_AGE = 25 * 60 * 1000

export default function useWorkspaceVideos({ wid, active }) {
  const { created, deleted } = useLibrary()
  const [tick, setTick] = useState(0)
  const [state, setState] = useState({ wid: null, assets: null, error: '' })
  const fetched = useRef({ stamp: null, at: 0 })
  const stamp = `${wid}:${created}:${deleted}:${tick}`

  useEffect(() => {
    if (!active || !wid) return
    const last = fetched.current
    if (last.stamp === stamp && Date.now() - last.at < MAX_AGE) return
    let alive = true
    api.get(`/workspaces/${wid}/assets?kind=video`)
      .then((assets) => {
        if (!alive) return
        fetched.current = { stamp, at: Date.now() }
        setState({ wid, assets, error: '' })
      })
      .catch((e) => { if (alive) setState((s) => ({ wid, assets: s.wid === wid ? s.assets : null, error: e.message })) })
    return () => { alive = false }
  }, [active, wid, stamp])

  const retry = useCallback(() => setTick((n) => n + 1), [])
  const own = state.wid === wid
  return { assets: own ? state.assets : null, error: own ? state.error : '', retry }
}
