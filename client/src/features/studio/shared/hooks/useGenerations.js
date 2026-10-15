import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../../../api/client.js'
import { useApp } from '../../../../app/AppContext.jsx'
import { useLibrary } from '../../../library/LibraryContext.jsx'

const isActive = (g) => g.status === 'pending' || g.status === 'running'
const visible = (g) => !(g.status === 'succeeded' && !g.asset)

export function useGenerations(kind) {
  const { wid, refreshSubscription } = useApp()
  const { deleted, notifyCreated } = useLibrary()
  const [items, setItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const ref = useRef(items)
  ref.current = items

  useEffect(() => {
    api.get(`/workspaces/${wid}/generations?kind=${kind}`).then((list) => setItems(list.filter(visible))).catch(() => {}).finally(() => setLoaded(true))
  }, [wid, kind, deleted])

  useEffect(() => {
    const timer = setInterval(async () => {
      const active = ref.current.filter(isActive)
      if (!active.length) return
      const next = await Promise.all(active.map((g) => api.get(`/workspaces/${wid}/generations/${g.id}`).catch(() => g)))
      setItems((cur) => cur.map((g) => next.find((n) => n.id === g.id) || g))
      if (next.some((n) => n.status === 'failed')) refreshSubscription()
      if (next.some((n) => n.status === 'succeeded')) notifyCreated()
    }, 4000)
    return () => clearInterval(timer)
  }, [wid, refreshSubscription, notifyCreated])

  const add = useCallback((gen) => {
    setItems((x) => [gen, ...x])
    if (gen.status === 'succeeded') notifyCreated()
  }, [notifyCreated])
  return { items, add, loaded }
}
