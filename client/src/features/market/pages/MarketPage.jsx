import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router-dom'
import PageFrame from '@/layout/components/PageFrame.jsx'
import TemplateMarket from '../components/TemplateMarket.jsx'

const TABS = [[{ to: '/market/template', labelKey: 'market.template', icon: 'braces' }]]
const SECTIONS = ['template']

export default function MarketPage() {
  const { t } = useTranslation()
  const { section } = useParams()

  if (!SECTIONS.includes(section)) return <Navigate to="/market/template" replace />

  return (
    <PageFrame title={t('nav.market')} ariaLabel={t('market.navAria')} tabs={TABS}>
      {section === 'template' && <TemplateMarket />}
    </PageFrame>
  )
}
