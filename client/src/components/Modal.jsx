import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'

const EXIT_MS = 160
const stack = []

export default function Modal({ title, onClose, wide = false, className = '', children }) {
  const { t } = useTranslation()
  const box = useRef(null)
  const timer = useRef(0)
  const latest = useRef(onClose)
  const [closing, setClosing] = useState(false)

  useEffect(() => { latest.current = onClose })

  const close = useCallback(() => {
    if (timer.current) return
    setClosing(true)
    const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    timer.current = setTimeout(() => latest.current(), instant ? 0 : EXIT_MS)
  }, [])

  useEffect(() => {
    const me = {}
    stack.push(me)
    const onKey = (e) => { if (e.key === 'Escape' && stack[stack.length - 1] === me) close() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    if (!box.current?.contains(document.activeElement)) box.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      stack.splice(stack.indexOf(me), 1)
      if (!stack.length) document.body.style.overflow = ''
    }
  }, [close])
  useEffect(() => () => clearTimeout(timer.current), [])

  return createPortal(
    <div className={'overlay' + (closing ? ' closing' : '')} onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}>
      <div ref={box} tabIndex={-1} className={'modal' + (wide ? ' wide' : '') + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={title}>
        <button className="icon-btn modal-close" onClick={close} aria-label={t('common.close')}><Icon name="close" /></button>
        {title && <h2>{title}</h2>}
        {typeof children === 'function' ? children(close) : children}
      </div>
    </div>,
    document.body
  )
}
