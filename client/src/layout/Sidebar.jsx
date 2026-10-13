import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { api } from '../api/client.js'
import { useApp } from '../app/AppContext.jsx'
import Brand from '../components/Brand.jsx'
import Button from '../components/Button.jsx'
import Icon from '../components/Icon.jsx'
import { NAV } from './nav.js'
import CreditsCard from '../features/billing/CreditsCard.jsx'
import WorkspaceMenu from '../features/workspace/WorkspaceMenu.jsx'

export default function Sidebar() {
  const { t } = useTranslation()
  const { user } = useApp()
  const logout = async () => { await api.post('/auth/logout'); location.href = '/' }

  return (
    <aside className="side">
      <Brand />
      <WorkspaceMenu />
      <nav className="side-nav" aria-label={t('common.mainNav')}>
        {NAV.filter((n) => n.sidebar !== false).map((n) => <NavLink key={n.to} to={n.to}><Icon name={n.icon} />{t(n.labelKey)}</NavLink>)}
      </nav>
      <div className="side-foot">
        <CreditsCard />
        <div className="usercard">
          {user.avatar_url ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-dot" />}
          <div>
            <strong>{user.name || user.email}</strong>
            <Button variant="link" size="sm" onClick={logout}>{t('auth.logout')}</Button>
          </div>
        </div>
      </div>
    </aside>
  )
}
