import { useEffect, useMemo, useState } from 'react'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useLibrary } from '@/features/library'

export default function useVideoAssets() {
  const { wid } = useApp()
  const { created, deleted } = useLibrary()
  const [assets, setAssets] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { setAssets(null) }, [wid])

  useEffect(() => {
    let alive = true
    api.get(`/workspaces/${wid}/assets`)
      .then((list) => { if (alive) { setAssets(list.filter((a) => a.kind === 'video')); setError('') } })
      .catch((e) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [wid, created, deleted])

  const byId = useMemo(() => new Map((assets || []).map((a) => [a.id, a])), [assets])
  return { assets, byId, error }
}
