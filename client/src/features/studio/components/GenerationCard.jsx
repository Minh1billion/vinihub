import { useTranslation } from 'react-i18next'
import { MediaCard } from '@/features/library'
import PendingCard from './PendingCard.jsx'

export default function GenerationCard({ gen, onOpen }) {
  const { t } = useTranslation()
  if (gen.status === 'succeeded') {
    if (!gen.asset) return null
    const asset = gen.negative_prompt ? { ...gen.asset, negative_prompt: gen.negative_prompt } : gen.asset
    return <MediaCard asset={asset} onOpen={onOpen} />
  }
  if (gen.status === 'failed') {
    return (
      <div className="failed" role="alert">
        <strong>{t('gen.failed')}</strong>
        <span>{gen.error}</span>
      </div>
    )
  }
  const label = gen.status === 'pending' ? t('gen.queued') : gen.kind === 'video' ? t('gen.makingVideo') : t('gen.makingImage')
  return <PendingCard label={label} prompt={gen.prompt} negative={gen.negative_prompt} />
}
