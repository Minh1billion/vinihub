import { useTranslation } from 'react-i18next'
import Icon from '../../components/Icon.jsx'
import Meter from '../../components/Meter.jsx'
import { COST } from './costs.js'

const COSTS = [
  { key: 'chat', icon: 'idea', labelKey: 'billing.costChat' },
  { key: 'image', icon: 'image', labelKey: 'billing.costImage' },
  { key: 'video', icon: 'video', labelKey: 'billing.costVideo' },
]

export default function UsagePanel({ sub }) {
  const { t } = useTranslation()
  return (
    <>
      {sub && (
        <section className="aside-sec usage">
          <span className="aside-h">{t('billing.creditsThisMonth')}</span>
          <p className="usage-num num"><b>{sub.used_credits}</b> / {sub.plan.monthly_credits}</p>
          <Meter used={sub.used_credits} max={sub.plan.monthly_credits} large />
          <small>{t('billing.planNote', { plan: sub.plan.name })}</small>
        </section>
      )}
      <section className="aside-sec">
        <h3 className="aside-h">{t('billing.costsTitle')}</h3>
        <ul className="aside-rows">
          {COSTS.map((c) => (
            <li key={c.key}>
              <Icon name={c.icon} size={18} />
              <span>{t(c.labelKey)}</span>
              <span className="num">{COST[c.key]}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
