import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const GAP = 8
const EDGE = 8

export default function Tip() {
  const [tip, setTip] = useState(null)
  const node = useRef(null)

  useEffect(() => {
    const target = (e) => e.target.closest?.('[data-tip]')
    const show = (e) => {
      const el = target(e)
      if (!el) return
      if (e.type === 'pointerover' && e.pointerType !== 'mouse') return
      if (e.type === 'focusin' && !el.matches(':focus-visible')) return
      const r = el.getBoundingClientRect()
      setTip({ text: el.dataset.tip, x: r.left + r.width / 2, top: r.top, bottom: r.bottom })
    }
    const hide = () => setTip(null)
    document.addEventListener('pointerover', show)
    document.addEventListener('focusin', show)
    document.addEventListener('pointerout', hide)
    document.addEventListener('focusout', hide)
    document.addEventListener('pointerdown', hide)
    window.addEventListener('scroll', hide, true)
    return () => {
      document.removeEventListener('pointerover', show)
      document.removeEventListener('focusin', show)
      document.removeEventListener('pointerout', hide)
      document.removeEventListener('focusout', hide)
      document.removeEventListener('pointerdown', hide)
      window.removeEventListener('scroll', hide, true)
    }
  }, [])

  useLayoutEffect(() => {
    const el = node.current
    if (!tip || !el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    el.style.left = `${Math.min(window.innerWidth - w - EDGE, Math.max(EDGE, tip.x - w / 2))}px`
    el.style.top = `${tip.top - h - GAP < EDGE ? tip.bottom + GAP : tip.top - h - GAP}px`
  }, [tip])

  return tip ? createPortal(<div ref={node} className="tip" role="tooltip">{tip.text}</div>, document.body) : null
}
