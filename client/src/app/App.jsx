import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './providers/AppContext.jsx'
import { DialogProvider } from './providers/DialogContext.jsx'
import { SessionProvider } from './providers/SessionContext.jsx'
import { LibraryProvider } from '@/features/library'
import Shell from '@/layout/components/Shell.jsx'
import { LoginPage, AcceptInvitePage } from '@/features/auth'
import { StudioPage } from '@/features/studio'
import { WorkshopPage } from '@/features/workshop'
import { BillingPage } from '@/features/billing'
import { MarketPage } from '@/features/market'
import { ProvidersPage } from '@/features/providers'
import { ProfilePage } from '@/features/profile'

function Gate() {
  const { user } = useApp()
  if (user === undefined) return <div className="boot" />
  if (user === null) return <LoginPage />
  return (
    <SessionProvider userId={user.id}>
    <BrowserRouter>
      <Routes>
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/studio" replace />} />
          <Route path="/studio/:section?" element={<StudioPage />} />
          <Route path="/workshop/:section?" element={<WorkshopPage />} />
          <Route path="/market/:section?" element={<MarketPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/studio" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </SessionProvider>
  )
}

export default function App() {
  return <AppProvider><DialogProvider><LibraryProvider><Gate /></LibraryProvider></DialogProvider></AppProvider>
}
