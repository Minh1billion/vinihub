import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Icon from '../../../../components/Icon.jsx'
import { SHAPE_ICONS, SHAPE_KINDS } from '../utils/layers.js'

const GAP = 8
const EDGE = 8
const CLOSE_DELAY = 180

export default function ShapeMenu({ onPick }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ left: 0, top: 0 })
  const btn = useRef(null)
  const panel = useRef(null)
  const timer = useRef(0)
  const viaKey = useRef(false)

  const cancel = () => clearTimeout(timer.current)
  const show = () => {
    cancel()
    setOpen(true)
  }
  const hide = () => {
    cancel()
    setOpen(false)
  }
  const later = () => {
    cancel()
    timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
  }

  useLayoutEffect(() => {
    const trigger = btn.current
    const el = panel.current
    if (!open || !trigger || !el) return
    const r = trigger.getBoundingClientRect()
    const w = el.offsetWidth
    const h = el.offsetHeight
    const below = window.matchMedia('(max-width: 900px)').matches
    const left = below ? r.left + r.width / 2 - w / 2 : r.right + GAP
    const top = below ? r.top - h - GAP : r.top + r.height / 2 - h / 2
    setPos({
      left: Math.min(window.innerWidth - w - EDGE, Math.max(EDGE, left)),
      top: Math.min(window.innerHeight - h - EDGE, Math.max(EDGE, top)),
    })
  }, [open])

  useEffect(() => {
    if (!open) return
    if (viaKey.current) panel.current?.querySelector('button')?.focus()
    const onDown = (e) => {
      if (btn.current?.contains(e.target) || panel.current?.contains(e.target)) return
      hide()
    }
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      hide()
      btn.current?.focus()
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', hide)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', hide)
    }
  }, [open])

  useEffect(() => cancel, [])

  const pick = (kind) => {
    hide()
    onPick(kind)
  }

  const label = t('editor.rail.shape')

  return (
    <>
      <button ref={btn} type="button" className={'ed-tool' + (open ? ' on' : '')} aria-haspopup="menu" aria-expanded={open}
        data-tip={open ? undefined : label} aria-label={label}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') show() }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') later() }}
        onClick={(e) => { viaKey.current = e.detail === 0; show() }}>
        <span className="ed-tool-ic"><Icon name="shape" size={18} /></span>
      </button>
      {open && createPortal(
        <div ref={panel} className="ed-flyout" role="menu" aria-label={label} style={{ left: pos.left, top: pos.top }}
          onPointerEnter={(e) => { if (e.pointerType === 'mouse') cancel() }}
          onPointerLeave={(e) => { if (e.pointerType === 'mouse') later() }}>
          {SHAPE_KINDS.map((k) => (
            <button key={k} type="button" role="menuitem" className="ed-tool" data-tip={t(`editor.shape.${k}`)} aria-label={t(`editor.shape.${k}`)} onClick={() => pick(k)}>
              <span className="ed-tool-ic"><Icon name={SHAPE_ICONS[k]} size={18} /></span>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
