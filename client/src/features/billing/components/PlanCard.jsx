import { useTranslation } from 'react-i18next'
import Button from '@/shared/ui/Button.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import { intlLocale } from '@/shared/i18n/index.js'

export default function PlanCard({ plan, current, featured, onChoose }) {
  const { t } = useTranslation()
  const price = plan.price_vnd
    ? t('plan.perMonth', { amount: plan.price_vnd.toLocaleString(intlLocale()) })
    : t('plan.free')
  return (
    <article className={'plan' + (current ? ' current' : '') + (featured ? ' featured' : '')}>
      {featured && <span className="plan-badge">{t('plan.popular')}</span>}
      <h2>{plan.name}</h2>
      <p className="price">{price}</p>
      <ul>{plan.features.map((f) => <li key={f}><Icon name="check" size={16} />{f}</li>)}</ul>
      <Button variant={current ? 'ghost' : 'primary'} block disabled={current} onClick={() => onChoose(plan.id)}>
        {current ? t('plan.current') : t('plan.choose', { plan: plan.name })}
      </Button>
    </article>
  )
}
