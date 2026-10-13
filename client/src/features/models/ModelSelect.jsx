import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useModels } from './useModels.js'
import Select from '../../components/Select.jsx'
import ProviderLogo from './ProviderLogo.jsx'

const list = (a) => (a?.length ? a.join(', ') : null)
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
const tokens = (n) => (n > 0 ? compact.format(n) : null)
const FRAMES = { first_frame: 'model.firstFrame', last_frame: 'model.lastFrame' }

function specs(t, kind, caps) {
  if (!caps) return []
  const yesNo = (b) => (b ? t('common.yes') : t('common.no'))
  const rows = []
  const refs = (n) => (n ? `${n}` : t('common.no'))
  if (kind === 'chat') {
    rows.push([t('model.context'), tokens(caps.context_window)])
    rows.push([t('model.maxOutput'), tokens(caps.max_output)])
    rows.push([t('model.vision'), caps.vision ? t('common.yes') : null])
  }
  if (kind === 'image') {
    rows.push([t('model.ratio'), list(caps.aspect_ratios)])
    rows.push([t('model.size'), list(caps.image_sizes)])
    rows.push([t('common.referenceImages'), refs(caps.reference_images)])
    rows.push([t('model.negativePrompt'), caps.negative_prompt_key ? t('common.yes') : null])
  }
  if (kind === 'video') {
    const d = caps.durations || []
    rows.push([t('common.duration'), d.length
      ? (d.length > 1 ? t('video.secondsRange', { min: Math.min(...d), max: Math.max(...d) }) : t('video.seconds', { count: d[0] }))
      : null])
    rows.push([t('common.resolution'), list(caps.resolutions)])
    rows.push([t('model.ratio'), list(caps.aspect_ratios)])
    rows.push([t('model.frames'), list((caps.frame_images || []).map((f) => (FRAMES[f] ? t(FRAMES[f]) : f)))])
    rows.push([t('model.audio'), yesNo(caps.audio)])
    rows.push([t('model.seed'), yesNo(caps.seed)])
    rows.push([t('common.referenceImages'), refs(caps.reference_images)])
    rows.push([t('model.motionControl'), yesNo(caps.motion_control)])
    rows.push([t('model.negativePrompt'), caps.negative_prompt_key ? t('common.yes') : null])
  }
  return rows.filter(([, v]) => v)
}

const toOption = (t, kind) => (i) => {
  const k = i.name.indexOf(': ')
  const vendor = k > 0 ? i.name.slice(0, k) : ''
  const label = k > 0 ? i.name.slice(k + 2) : i.name
  const logoKey = i.provider.driver === 'openrouter' ? i.model_id : i.provider.slug
  return {
    value: i.id,
    label,
    vendor,
    leading: <ProviderLogo id={logoKey} vendor={vendor || i.provider.name} />,
    info: {
      logo: <ProviderLogo id={logoKey} vendor={vendor || i.provider.name} size={28} />,
      title: label,
      subtitle: vendor || i.provider.name,
      rows: [[t('model.provider'), i.provider.name], ...specs(t, kind, i.caps), ['ID', i.model_id]],
    },
  }
}

export default function ModelSelect({ kind, value, onChange, className = '' }) {
  const { t } = useTranslation()
  const models = useModels()
  const options = useMemo(() => (models?.[kind] || []).map(toOption(t, kind)), [models, kind, t])
  return (
    <Select
      label={t('common.model')} className={className} options={options} loading={!models}
      value={value || models?.defaults[kind] || ''} onChange={onChange}
      placeholder={t('model.none')} emptyText={t('model.noneEmpty')}
    />
  )
}
