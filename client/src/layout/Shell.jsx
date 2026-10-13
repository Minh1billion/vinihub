import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { useApp } from '../app/AppContext.jsx'
import { useLibrary } from '../features/library/LibraryContext.jsx'
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

  useEffect(() => {
    if (open) { setMounted(true); return }
    const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const id = setTimeout(() => setMounted(false), instant ? 0 : EXIT_MS)
    return () => clearTimeout(id)
  }, [open])

  return (
    <div className={'shell' + (open ? ' shell--library' : '')}>
      <Sidebar />
      <LanguageSwitcher />
      <main className="main">{wid ? <Outlet key={wid} /> : <p className="page-loading">{t('workspace.loading')}</p>}</main>
      {open || mounted ? <LibrarySidebar /> : <LibraryRail />}
      <MobileNav />
    </div>
  )
}
