import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Icon from '@/shared/ui/Icon.jsx'

const EDGE = 8

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ left: x, top: y })

  useLayoutEffect(() => {
    const el = ref.current
    setPos({
      left: Math.max(EDGE, Math.min(x, window.innerWidth - el.offsetWidth - EDGE)),
      top: Math.max(EDGE, Math.min(y, window.innerHeight - el.offsetHeight - EDGE)),
    })
    el.querySelector('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [x, y])

  useEffect(() => {
    const away = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('pointerdown', away, true)
    window.addEventListener('blur', onClose)
    window.addEventListener('resize', onClose)
    window.addEventListener('wheel', onClose, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', away, true)
      window.removeEventListener('blur', onClose)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('wheel', onClose)
    }
  }, [onClose])

  const onKeyDown = (e) => {
    e.stopPropagation()
    const buttons = [...ref.current.querySelectorAll('button:not(:disabled)')]
    const i = buttons.indexOf(document.activeElement)
    const go = (b) => { e.preventDefault(); b?.focus() }
    if (e.key === 'ArrowDown') go(buttons[(i + 1) % buttons.length])
    else if (e.key === 'ArrowUp') go(buttons[(i - 1 + buttons.length) % buttons.length])
    else if (e.key === 'Home') go(buttons[0])
    else if (e.key === 'End') go(buttons[buttons.length - 1])
    else if (e.key === 'Escape' || e.key === 'Tab') { e.preventDefault(); onClose() }
  }

  return (
    <div ref={ref} className="ed-menu" role="menu" style={{ left: pos.left, top: pos.top }} onKeyDown={onKeyDown} onContextMenu={(e) => e.preventDefault()}>
      {items.map((it) => (it.sep ? (
        <hr key={it.id} className="ed-menu-sep" />
      ) : (
        <button key={it.id} type="button" role="menuitem" className={'ed-menu-item' + (it.danger ? ' danger' : '')} disabled={it.disabled}
          onClick={() => { onClose(); it.run() }}>
          <Icon name={it.icon} size={16} />
          <span>{it.label}</span>
        </button>
      )))}
    </div>
  )
}
