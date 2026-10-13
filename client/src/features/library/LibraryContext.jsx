import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const Ctx = createContext(null)
export const useLibrary = () => useContext(Ctx)

export function LibraryProvider({ children }) {
  const [open, setOpen] = useState(false)
  const [created, setCreated] = useState(0)
  const [deleted, setDeleted] = useState(0)

  const toggle = useCallback(() => setOpen((o) => !o), [])
  const close = useCallback(() => setOpen(false), [])
  const notifyCreated = useCallback(() => setCreated((n) => n + 1), [])
  const notifyDeleted = useCallback(() => setDeleted((n) => n + 1), [])

  const value = useMemo(
    () => ({ open, toggle, close, created, deleted, notifyCreated, notifyDeleted }),
    [open, toggle, close, created, deleted, notifyCreated, notifyDeleted]
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
