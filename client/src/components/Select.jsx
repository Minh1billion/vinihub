import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import Icon from './Icon.jsx'

const GAP = 6
const MARGIN = 10
const MAX_H = 340
const MIN_W = 260
const EXIT_MS = 120
const TIP_W = 290

const fold = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export default function Select({
  options, value, onChange, label, triggerLabel, icon, searchable, loading = false,
  placeholder, emptyText, className = '', disabled = false,
}) {
  const { t } = useTranslation()
  const uid = useId()
  const [state, setState] = useState('closed')
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState(null)
  const [tip, setTip] = useState(null)
  const [tipPos, setTipPos] = useState(null)
  const tipEl = useRef(null)
  const trigger = useRef(null)
  const pop = useRef(null)
  const list = useRef(null)
  const search = useRef(null)
  const timer = useRef(0)

  const showSearch = searchable ?? options.length > 8
  const selected = options.find((o) => o.value === value)
  const text = triggerLabel ?? selected?.label ?? (loading ? t('select.loading') : placeholder ?? t('select.placeholder'))

  const shown = useMemo(() => {
    const q = fold(query.trim())
    if (!q) return options
    return options.filter((o) => fold(`${o.vendor || ''} ${o.label}`).includes(q))
  }, [options, query])

  const place = useCallback(() => {
    const el = trigger.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const width = Math.min(Math.max(r.width, MIN_W), vw - MARGIN * 2)
    let left = r.left
    if (left + width > vw - MARGIN) left = Math.max(MARGIN, r.right - width)
    const below = vh - r.bottom - GAP - MARGIN
    const above = r.top - GAP - MARGIN
    const up = below < 220 && above > below
    setPos({
      left, width, up,
      maxHeight: Math.max(160, Math.min(MAX_H, up ? above : below)),
      ...(up ? { bottom: vh - r.top + GAP } : { top: r.bottom + GAP }),
    })
  }, [])

  const centerOn = (idx) => {
    const l = list.current
    const el = l?.children[idx]
    if (el) l.scrollTop = el.offsetTop - l.clientHeight / 2 + el.offsetHeight / 2
  }
  const reveal = (idx) => {
    const l = list.current
    const el = l?.children[idx]
    if (!el) return
    if (el.offsetTop < l.scrollTop) l.scrollTop = el.offsetTop
    else if (el.offsetTop + el.offsetHeight > l.scrollTop + l.clientHeight) l.scrollTop = el.offsetTop + el.offsetHeight - l.clientHeight
  }

  useLayoutEffect(() => {
    const li = tip == null ? null : list.current?.children[tip]
    if (!li || !tipEl.current || !pop.current) { setTipPos(null); return }
    const vw = window.innerWidth
    const vh = window.innerHeight
    const p = pop.current.getBoundingClientRect()
    const r = li.getBoundingClientRect()
    const h = tipEl.current.offsetHeight
    const clampTop = (t) => Math.max(MARGIN, Math.min(t, vh - h - MARGIN))
    if (p.right + GAP + TIP_W <= vw - MARGIN) setTipPos({ left: p.right + GAP, top: clampTop(r.top) })
    else if (p.left - GAP - TIP_W >= MARGIN) setTipPos({ left: p.left - GAP - TIP_W, top: clampTop(r.top) })
    else {
      const left = Math.max(MARGIN, Math.min(p.left, vw - TIP_W - MARGIN))
      const below = r.bottom + GAP
      setTipPos({ left, top: below + h <= vh - MARGIN ? below : clampTop(r.top - h - GAP) })
    }
  }, [tip, pos])

  useEffect(() => { if (state !== 'open') setTip(null) }, [state])

  const openMenu = () => {
    if (disabled || loading || !options.length) return
    clearTimeout(timer.current)
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setState('open')
  }
  const closeMenu = useCallback((refocus = true) => {
    clearTimeout(timer.current)
    setState((s) => (s === 'open' ? 'closing' : s))
    timer.current = setTimeout(() => setState('closed'), reduced() ? 0 : EXIT_MS)
    if (refocus) trigger.current?.focus({ preventScroll: true })
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const choose = (o) => {
    if (!o) return
    if (o.value !== value) onChange(o.value)
    closeMenu(true)
  }

  useLayoutEffect(() => {
    if (state !== 'open') return
    place()
    centerOn(active)
    ;(showSearch ? search.current : list.current)?.focus({ preventScroll: true })
  }, [state === 'open'])

  useEffect(() => {
    if (state !== 'open') return
    const down = (e) => {
      if (trigger.current?.contains(e.target) || pop.current?.contains(e.target)) return
      closeMenu(false)
    }
    const reflow = (e) => { if (!pop.current?.contains(e.target)) place() }
    document.addEventListener('mousedown', down)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', reflow, true)
    return () => {
      document.removeEventListener('mousedown', down)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', reflow, true)
    }
  }, [state, place, closeMenu])

  const onQuery = (e) => { setQuery(e.target.value); setActive(0); if (list.current) list.current.scrollTop = 0 }

  const move = (next) => {
    setActive(next)
    reveal(next)
    setTip(shown[next]?.info ? next : null)
  }
  const onPopKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(Math.min(active + 1, shown.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(Math.max(active - 1, 0)) }
    else if (e.key === 'Home' && !showSearch) { e.preventDefault(); move(0) }
    else if (e.key === 'End' && !showSearch) { e.preventDefault(); move(shown.length - 1) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(shown[active]) }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true) }
    else if (e.key === 'Tab') closeMenu(true)
  }
  const onTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu() }
  }

  const isOpen = state === 'open'
  const listId = `${uid}-list`

  return (
    <>
      <button
        ref={trigger} type="button" role="combobox" className={'select ' + className}
        aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={listId}
        aria-label={label ? `${label}: ${text}` : undefined}
        disabled={disabled || (!loading && !options.length)}
        onClick={() => (isOpen ? closeMenu(false) : openMenu())} onKeyDown={onTriggerKey}
      >
        {icon && <Icon name={icon} size={16} />}
        {!triggerLabel && selected?.leading}
        <span className="select-value">
          {text}
          {!triggerLabel && !selected?.leading && selected?.vendor && <small className="select-vendor">{selected.vendor}</small>}
        </span>
        <Icon name="chevron" size={16} />
      </button>

      {state !== 'closed' && createPortal(
        <div
          ref={pop} className="select-pop" data-state={state} data-up={pos?.up ? 'true' : 'false'} onKeyDown={onPopKey}
          style={pos ? { ...pos, visibility: 'visible' } : { visibility: 'hidden' }}
        >
          {showSearch && (
            <div className="select-search">
              <Icon name="search" size={16} />
              <input
                ref={search} value={query} onChange={onQuery} placeholder={t('select.search')} aria-label={t('select.searchAria')}
                aria-controls={listId} aria-activedescendant={shown.length ? `${uid}-${active}` : undefined}
                autoComplete="off" spellCheck={false}
              />
            </div>
          )}
          <ul
            ref={list} id={listId} role="listbox" className="select-list" tabIndex={-1}
            onMouseLeave={() => setTip(null)} onScroll={() => setTip(null)}
            aria-activedescendant={!showSearch && shown.length ? `${uid}-${active}` : undefined}
          >
            {shown.map((o, i) => (
              <li
                key={o.value} id={`${uid}-${i}`} role="option" aria-selected={o.value === value}
                data-active={i === active} onClick={() => choose(o)}
                onMouseMove={() => {
                  if (active !== i) setActive(i)
                  if (tip !== i) setTip(o.info ? i : null)
                }}
              >
                {o.leading}
                <span className="select-opt">{o.label}</span>
                {!o.leading && o.vendor && <small className="select-vendor">{o.vendor}</small>}
                <span className="select-check">{o.value === value && <Icon name="check" size={16} />}</span>
              </li>
            ))}
            {!shown.length && <li className="select-empty" role="presentation">{query ? t('select.noResults') : emptyText ?? t('select.empty')}</li>}
          </ul>
        </div>,
        document.body,
      )}

      {state === 'open' && tip != null && shown[tip]?.info && createPortal(
        <div
          ref={tipEl} className="select-tip" role="tooltip"
          style={tipPos ? { ...tipPos, width: TIP_W, visibility: 'visible' } : { top: 0, left: 0, width: TIP_W, visibility: 'hidden' }}
        >
          <div className="select-tip-head">
            {shown[tip].info.logo}
            <div>
              <strong>{shown[tip].info.title}</strong>
              {shown[tip].info.subtitle && <small>{shown[tip].info.subtitle}</small>}
            </div>
          </div>
          {!!shown[tip].info.rows?.length && (
            <dl>
              {shown[tip].info.rows.map(([k, v]) => (
                <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
