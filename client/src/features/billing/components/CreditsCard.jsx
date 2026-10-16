import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { useApp } from '@/app/providers/AppContext.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Meter from '@/shared/ui/Meter.jsx'
import { intlLocale } from '@/shared/i18n/index.js'

export default function CreditsCard({ compact = false }) {
  const { t } = useTranslation()
  const { subscription: sub } = useApp()
  if (!sub) return null

  const { plan, used_credits: used } = sub
  const max = plan.monthly_credits
  const left = Math.max(0, max - used)
  const low = max > 0 && left / max < 0.2
  const upsell = low || plan.id === 'free'
  const fmt = (n) => n.toLocaleString(intlLocale())

  return (
    <NavLink to="/billing" className={'credits' + (low ? ' low' : '') + (upsell ? ' upsell' : '')}
      data-tip={compact ? `${fmt(left)} ${t('billing.creditsLeft')}` : undefined}>
      <span className="credits-top">
        <span className="credits-plan"><Icon name="studio" size={14} /><span className="credits-name">{plan.name}</span></span>
        <span className="credits-cta">
          {upsell ? t('billing.upgrade') : t('billing.manage')}
          <Icon name="chevron" size={14} />
        </span>
      </span>
      <span className="credits-left">
        <b className="num">{fmt(left)}</b>
        <span>{t('billing.creditsLeft')}</span>
      </span>
      <Meter used={used} max={max} />
      <small className="credits-foot">
        {low
          ? <><Icon name="alert" size={13} />{t('billing.lowCredits')}</>
          : t('billing.usedOf', { used: fmt(used), max: fmt(max) })}
      </small>
    </NavLink>
  )
}
