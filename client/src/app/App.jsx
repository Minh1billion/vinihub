import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './AppContext.jsx'
import { DialogProvider } from './DialogContext.jsx'
import { LibraryProvider } from '../features/library/LibraryContext.jsx'
import Shell from '../layout/Shell.jsx'
import LoginPage from '../features/auth/LoginPage.jsx'
import StudioPage from '../features/studio/StudioPage.jsx'
import BillingPage from '../features/billing/BillingPage.jsx'
import MarketPage from '../features/market/MarketPage.jsx'
import ProvidersPage from '../features/providers/ProvidersPage.jsx'
import AcceptInvitePage from '../features/invite/AcceptInvitePage.jsx'

function Gate() {
  const { user } = useApp()
  if (user === undefined) return <div className="boot" />
  if (user === null) return <LoginPage />
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/studio" replace />} />
          <Route path="/studio/:section?" element={<StudioPage />} />
          <Route path="/market/:section?" element={<MarketPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="*" element={<Navigate to="/studio" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default function App() {
  return <AppProvider><DialogProvider><LibraryProvider><Gate /></LibraryProvider></DialogProvider></AppProvider>
}
