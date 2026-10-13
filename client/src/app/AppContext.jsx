import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../api/client.js'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const { i18n } = useTranslation()
  const [user, setUser] = useState(undefined)
  const [workspaces, setWorkspaces] = useState([])
  const [wid, setWid] = useState(localStorage.getItem('vinihub.wid'))
  const [subscription, setSubscription] = useState(null)

  const reload = useCallback(async () => {
    try {
      const [me, list] = await Promise.all([api.get('/auth/me'), api.get('/workspaces')])
      setUser(me)
      setWorkspaces(list)
      setWid((cur) => (list.some((w) => w.id === cur) ? cur : list[0]?.id))
    } catch {
      setUser(null)
    }
  }, [])

  const refreshSubscription = useCallback(
    () => api.get('/billing/subscription').then(setSubscription).catch(() => {}),
    []
  )

  useEffect(() => { reload() }, [reload])
  useEffect(() => { if (wid) localStorage.setItem('vinihub.wid', wid) }, [wid])
  useEffect(() => { if (user) refreshSubscription() }, [user, refreshSubscription, i18n.resolvedLanguage])

  return (
    <Ctx.Provider value={{ user, workspaces, wid, setWid, reload, subscription, refreshSubscription }}>
      {children}
    </Ctx.Provider>
  )
}
