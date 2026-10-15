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

export default function Sidebar({ collapsed = false, onToggle }) {
  const { t } = useTranslation()
  const { user } = useApp()
  const logout = async () => { await api.post('/auth/logout'); location.href = '/' }
  const toggleLabel = t(collapsed ? 'nav.expand' : 'nav.collapse')
  const displayName = user.name || user.email

  return (
    <aside className={'side' + (collapsed ? ' side--collapsed' : '')}>
      <div className="side-head">
        <Brand />
        <button type="button" className="icon-btn side-toggle" onClick={onToggle}
          aria-expanded={!collapsed} aria-label={toggleLabel} data-tip={toggleLabel}>
          <Icon name="panelLeft" />
        </button>
      </div>
      <button type="button" className="icon-btn side-expand" onClick={onToggle}
        aria-label={t('nav.expand')} data-tip={t('nav.expand')} tabIndex={collapsed ? 0 : -1}>
        <Icon name="panelLeft" />
      </button>
      <WorkspaceMenu compact={collapsed} />
      <nav className="side-nav" aria-label={t('common.mainNav')}>
        {NAV.filter((n) => n.sidebar !== false).map((n) => {
          const label = t(n.labelKey)
          return (
            <NavLink key={n.to} to={n.to} data-tip={collapsed ? label : undefined}>
              <Icon name={n.icon} /><span className="side-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
      <div className="side-foot">
        <CreditsCard compact={collapsed} />
        <div className="usercard">
          <div className="usercard-main" data-tip={collapsed ? displayName : undefined}>
            {user.avatar_url ? <img src={user.avatar_url} alt="" referrerPolicy="no-referrer" /> : <span className="avatar-dot" />}
            <div className="usercard-text">
              <strong>{displayName}</strong>
              <Button variant="link" size="sm" onClick={logout}>{t('auth.logout')}</Button>
            </div>
          </div>
          <button type="button" className="icon-btn sm usercard-out" onClick={logout}
            aria-label={t('auth.logout')} data-tip={t('auth.logout')}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
