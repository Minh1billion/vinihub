import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import Icon from '../components/Icon.jsx'
import { NAV } from './nav.js'

export default function MobileNav() {
  const { t } = useTranslation()
  return (
    <nav className="mobile-nav" aria-label={t('common.mainNav')}>
      {NAV.map((n) => <NavLink key={n.to} to={n.to}><Icon name={n.icon} size={22} /><span>{t(n.labelKey)}</span></NavLink>)}
    </nav>
  )
}
