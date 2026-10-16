import { useCallback, useEffect, useState } from 'react'

const KEY = 'vinihub.layout.side.collapsed'
const QUERY = '(min-width: 901px)'

const readStored = () => {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}
const readWide = () => window.matchMedia?.(QUERY).matches ?? true

export default function useSidebarCollapsed() {
  const [stored, setStored] = useState(readStored)
  const [wide, setWide] = useState(readWide)

  useEffect(() => {
    try { localStorage.setItem(KEY, stored ? '1' : '0') } catch {}
  }, [stored])

  useEffect(() => {
    const media = window.matchMedia?.(QUERY)
    if (!media) return
    const sync = (e) => setWide(e.matches)
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  const toggle = useCallback(() => setStored((v) => !v), [])
  return { collapsed: stored && wide, toggle }
}
