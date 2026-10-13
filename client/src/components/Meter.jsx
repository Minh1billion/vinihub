import { useTranslation } from 'react-i18next'

export default function Meter({ used, max, large = false }) {
  const { t } = useTranslation()
  const segments = large ? 24 : 10
  const ratio = max > 0 ? Math.min(1, used / max) : 0
  const filled = used > 0 ? Math.max(1, Math.round(ratio * segments)) : 0
  const low = 1 - ratio < 0.2
  return (
    <div className={'meter' + (large ? ' large' : '') + (low ? ' low' : '')} role="meter"
      aria-valuenow={used} aria-valuemin={0} aria-valuemax={max} aria-label={t('billing.meter')}>
      {Array.from({ length: segments }, (_, i) => <i key={i} className={i < filled ? 'on' : ''} />)}
    </div>
  )
}
