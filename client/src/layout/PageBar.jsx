import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

export default function PageBar({ title, ariaLabel, groups, actions }) {
  const { t, i18n } = useTranslation()
  const { pathname } = useLocation()
  const tabs = useRef(null)
  const [pill, setPill] = useState(null)
  const [ready, setReady] = useState(false)

  const measure = useCallback(() => {
    const el = tabs.current?.querySelector('a.active')
    if (!el) return setPill(null)
    setPill((p) => (p && p.left === el.offsetLeft && p.width === el.offsetWidth ? p : { left: el.offsetLeft, width: el.offsetWidth }))
  }, [])

  useLayoutEffect(() => {
    measure()
    tabs.current?.querySelector('a.active')?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
  }, [pathname, i18n.resolvedLanguage, measure])

  useEffect(() => {
    const watcher = new ResizeObserver(measure)
    watcher.observe(tabs.current)
    document.fonts?.ready.then(measure)
    return () => watcher.disconnect()
  }, [measure])

  useEffect(() => {
    if (!pill || ready) return
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [pill, ready])

  return (
    <nav className="page-bar" aria-label={ariaLabel}>
      <h1 className="sr-only">{title}</h1>
      <div className="page-tabs" ref={tabs}>
        {pill && <span className={'tab-pill' + (ready ? ' ready' : '')} style={pill} aria-hidden="true" />}
        {groups.map((items, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="tab-sep" aria-hidden="true" />}
            {items.map((item) => <NavLink key={item.to} to={item.to}><Icon name={item.icon} size={18} />{t(item.labelKey)}</NavLink>)}
          </Fragment>
        ))}
      </div>
      {actions && <div className="page-bar-end">{actions}</div>}
    </nav>
  )
}
