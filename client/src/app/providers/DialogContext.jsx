import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import AlertDialog from '@/shared/ui/AlertDialog.jsx'

const Ctx = createContext(null)
export const useDialog = () => useContext(Ctx)

let seq = 0

export function DialogProvider({ children }) {
  const [queue, setQueue] = useState([])

  const open = useCallback((tone, options, ask) => new Promise((resolve) => {
    const body = typeof options === 'string' ? { message: options } : options
    setQueue((q) => [...q, { id: ++seq, tone, ask, ...body, resolve }])
  }), [])

  const api = useMemo(() => ({
    info: (o) => open('info', o, false),
    warning: (o) => open('warning', o, false),
    error: (o) => open('error', o, false),
    confirm: (o) => open('confirm', o, true),
  }), [open])

  const current = queue[0]
  const settle = (value) => {
    current.resolve(value)
    setQueue((q) => q.slice(1))
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      {current && <AlertDialog key={current.id} {...current} onResult={settle} />}
    </Ctx.Provider>
  )
}
