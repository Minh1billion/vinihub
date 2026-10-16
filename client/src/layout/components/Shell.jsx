import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router-dom'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useLibrary, LibraryRail, LibrarySidebar } from '@/features/library'
import useSidebarCollapsed from '@/shared/hooks/useSidebarCollapsed.js'
import LanguageSwitcher from '@/shared/ui/LanguageSwitcher.jsx'
import { OnboardingModal } from '@/features/profile'
import MobileNav from './MobileNav.jsx'
import Sidebar from './Sidebar.jsx'

const EXIT_MS = 260

export default function Shell() {
  const { t } = useTranslation()
  const { wid, user } = useApp()
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
      {user?.onboarded === false && <OnboardingModal />}
    </div>
  )
}
