import { useCallback, useEffect, useRef, useState } from 'react'

export default function usePlayback({ end, span }) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timeRef = useRef(0)
  const limits = useRef({ end, span })
  limits.current = { end, span }

  const seek = useCallback((t) => {
    const next = Math.min(limits.current.span, Math.max(0, t))
    timeRef.current = next
    setTime(next)
  }, [])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now) => {
      const next = timeRef.current + (now - last) / 1000
      last = now
      if (next >= limits.current.end) {
        timeRef.current = limits.current.end
        setTime(limits.current.end)
        setPlaying(false)
        return
      }
      timeRef.current = next
      setTime(next)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

  const toggle = useCallback(() => {
    if (limits.current.end <= 0) return
    if (timeRef.current >= limits.current.end) seek(0)
    setPlaying((p) => !p)
  }, [seek])

  const stop = useCallback(() => {
    setPlaying(false)
    seek(0)
  }, [seek])

  return { time, playing, seek, toggle, stop }
}
