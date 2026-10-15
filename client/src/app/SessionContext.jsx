import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { loadSession, saveSession } from './sessionDb.js'

const Ctx = createContext(null)
const PERSIST = 'editor.'
const DELAY = 200
const MAX_WAIT = 1000

class Store extends Map {
  set(key, value) {
    super.set(key, value)
    if (this.onSet && key.startsWith(PERSIST)) this.onSet()
    return this
  }
}

export function SessionProvider({ userId, children }) {
  const store = useRef(null)
  if (!store.current) store.current = new Store()
  const boot = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const s = store.current
    let alive = true
    let timer = 0
    let running = false
    let again = false
    let dirty = false
    let first = 0

    const persist = async () => {
      if (running) { again = true; return }
      running = true
      dirty = false
      try {
        const entries = new Map([...s].filter(([key]) => key.startsWith(PERSIST)))
        await saveSession(userId, entries)
      } catch (e) {
        console.warn('[session] save failed', e)
        again = false
      } finally {
        running = false
      }
      if (again) { again = false; persist() }
    }
    const flush = () => { clearTimeout(timer); timer = 0; first = 0; persist() }
    const schedule = () => {
      dirty = true
      clearTimeout(timer)
      if (!first) first = Date.now()
      timer = setTimeout(flush, Math.max(0, Math.min(DELAY, MAX_WAIT - (Date.now() - first))))
    }
    const onHide = () => { if (document.visibilityState === 'hidden' && dirty) flush() }
    const onLeave = () => { if (dirty) flush() }

    if (!boot.current) boot.current = loadSession(userId)
    boot.current.then((entries) => {
      if (!alive) return
      for (const [key, value] of entries) Map.prototype.set.call(s, key, value)
      s.onSet = schedule
      setReady(true)
    })

    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onLeave)
    window.addEventListener('beforeunload', onLeave)
    return () => {
      alive = false
      s.onSet = null
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onLeave)
      window.removeEventListener('beforeunload', onLeave)
    }
  }, [userId])

  return <Ctx.Provider value={store}>{ready ? children : <div className="boot" />}</Ctx.Provider>
}

export function useSessionStore() {
  const shared = useContext(Ctx)
  const local = useRef(new Map())
  return shared || local
}

export function useSessionState(key, initial) {
  const store = useSessionStore()
  const [value, setValue] = useState(() => {
    if (store.current.has(key)) return store.current.get(key)
    return typeof initial === 'function' ? initial() : initial
  })
  useEffect(() => { store.current.set(key, value) }, [store, key, value])
  const set = useCallback((next) => setValue(next), [])
  return [value, set]
}

export function useSessionRef(key, initial = null) {
  const store = useSessionStore()
  if (!store.current.has(key)) store.current.set(key, { current: initial })
  return store.current.get(key)
}
