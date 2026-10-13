import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import { useApp } from '../../app/AppContext.jsx'
import { useDialog } from '../../app/DialogContext.jsx'
import { FieldError } from '../../components/Field.jsx'
import PageFrame from '../../layout/PageFrame.jsx'
import PlanCard from './PlanCard.jsx'
import UsagePanel from './UsagePanel.jsx'

const TABS = [[{ to: '/billing', labelKey: 'nav.billing', icon: 'billing' }]]

export default function BillingPage() {
  const { t, i18n } = useTranslation()
  const { subscription, refreshSubscription } = useApp()
  const dialog = useDialog()
  const [plans, setPlans] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => { api.get('/billing/plans').then(setPlans).catch((e) => setErr(e.message)) }, [i18n.resolvedLanguage])

  const choose = async (id) => {
    setErr('')
    try {
      const res = await api.post('/billing/checkout', { plan_id: id })
      if (res.checkout_url) { location.href = res.checkout_url; return }
      dialog.info(t('billing.testMode'))
      refreshSubscription()
    } catch (e) { setErr(e.message) }
  }

  const sub = subscription
  return (
    <PageFrame title={t('billing.title')} ariaLabel={t('billing.title')} tabs={TABS}
      aside={<UsagePanel sub={sub} />} asideTitle={t('billing.usageTitle')}>
      <FieldError>{err}</FieldError>
      <div className="plans scroll">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} current={sub?.plan.id === p.id} featured={p.id === 'pro'} onChoose={choose} />
        ))}
      </div>
    </PageFrame>
  )
}
