import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { useApp } from '../app/AppContext.jsx'
import { useLibrary } from '../features/library/LibraryContext.jsx'
import useSidebarCollapsed from '../hooks/useSidebarCollapsed.js'
import LanguageSwitcher from '../components/LanguageSwitcher.jsx'
import LibraryRail from '../features/library/LibraryRail.jsx'
import LibrarySidebar from '../features/library/LibrarySidebar.jsx'
import MobileNav from './MobileNav.jsx'
import Sidebar from './Sidebar.jsx'

const EXIT_MS = 260

export default function Shell() {
  const { t } = useTranslation()
  const { wid } = useApp()
  const { open } = useLibrary()
  const [mounted, setMounted] = useState(open)
  const { collapsed, toggle: toggleSide } = useSidebarCollapsed()
  const settled = useRef(false)

  useEffect(() => {
    if (open) { setMounted(true); return }
    const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(() => setMounted(false), instant ? 0 : EXIT_MS)
    return () => clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!settled.current) { settled.current = true; return }
    const id = setTimeout(() => window.dispatchEvent(new Event('vh:fit')), EXIT_MS + 40)
    return () => clearTimeout(id)
  }, [collapsed])

  return (
    <div className={'shell' + (open ? ' shell--library' : '') + (collapsed ? ' shell--collapsed' : '')}>
      <Sidebar collapsed={collapsed} onToggle={toggleSide} />
      <LanguageSwitcher />
      <main className="main">{wid ? <Outlet key={wid} /> : <p className="page-loading">{t('workspace.loading')}</p>}</main>
      {open || mounted ? <LibrarySidebar /> : <LibraryRail />}
      <MobileNav />
    </div>
  )
}
