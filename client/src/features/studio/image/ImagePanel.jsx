import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../api/client.js'
import { useApp } from '../../../app/AppContext.jsx'
import Button from '../../../components/Button.jsx'
import EmptyState, { SamplePrompts } from '../../../components/EmptyState.jsx'
import { Field, FieldError } from '../../../components/Field.jsx'
import ImageList from '../shared/ImageList.jsx'
import MediaViewer from '../../library/MediaViewer.jsx'
import ModelSelect from '../../models/ModelSelect.jsx'
import RatioPicker from '../shared/RatioPicker.jsx'
import Segmented from '../../../components/Segmented.jsx'
import { useModelCaps } from '../../models/useModels.js'
import { COST } from '../../billing/costs.js'
import GenerationCard from '../shared/GenerationCard.jsx'
import PendingCard from '../shared/PendingCard.jsx'
import SplitLayout from '../shared/SplitLayout.jsx'
import { useGenerations } from '../shared/useGenerations.js'

const first = (list, prefer) => (list.includes(prefer) ? prefer : list[0] ?? '')

export default function ImagePanel({ prompt, setPrompt }) {
  const { t } = useTranslation()
  const { wid, refreshSubscription } = useApp()
  const { items, add, loaded } = useGenerations('image')
  const [model, setModel] = useState('')
  const [ratio, setRatio] = useState('1:1')
  const [size, setSize] = useState('')
  const [quality, setQuality] = useState('')
  const [background, setBackground] = useState('')
  const [format, setFormat] = useState('')
  const [refs, setRefs] = useState([])
  const [negative, setNegative] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [viewing, setViewing] = useState(null)
  const live = useModelCaps('image', model)

  useEffect(() => {
    setRatio((r) => (live.aspect_ratios.includes(r) ? r : first(live.aspect_ratios, '1:1')))
    setSize((s) => (live.image_sizes.includes(s) ? s : first(live.image_sizes, '1K')))
    setQuality((q) => (live.qualities.includes(q) ? q : first(live.qualities, 'medium')))
    setBackground((b) => (live.backgrounds.includes(b) ? b : first(live.backgrounds, 'opaque')))
    setFormat((f) => (live.output_formats.includes(f) ? f : first(live.output_formats, 'png')))
    setRefs((r) => (r.length > live.reference_images ? r.slice(0, live.reference_images) : r))
    if (!live.negative_prompt_key) setNegative('')
  }, [live])

  const run = async () => {
    setBusy(true); setErr('')
    try {
      add(await api.post(`/workspaces/${wid}/images`, {
        prompt, model: model || undefined,
        aspect_ratio: live.aspect_ratios.length ? ratio : undefined,
        image_size: live.image_sizes.length ? size : undefined,
        quality: live.qualities.length ? quality : undefined,
        background: live.backgrounds.length ? background : undefined,
        output_format: live.output_formats.length ? format : undefined,
        reference_asset_ids: refs.map((r) => r.id),
        negative_prompt: live.negative_prompt_key && negative.trim() ? negative.trim() : undefined,
      }))
      refreshSubscription()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const form = (
    <>
      <Field label={t('image.promptLabel')}>
        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('image.promptPlaceholder')} />
      </Field>
      <Field label={t('common.model')}><ModelSelect kind="image" value={model} onChange={setModel} /></Field>
      {live.negative_prompt_key && (
        <Field label={t('image.negativeLabel')} hint={t('image.negativeHint')}>
          <textarea rows={2} maxLength={1000} value={negative} placeholder={t('image.negativePlaceholder')} onChange={(e) => setNegative(e.target.value)} />
        </Field>
      )}
      {live.aspect_ratios.length > 0 && (
        <Field label={t('common.aspectRatio')} group><RatioPicker options={live.aspect_ratios} value={ratio} onChange={setRatio} /></Field>
      )}
      {live.image_sizes.length > 0 && (
        <Field label={t('common.resolution')} group>
          <Segmented label={t('common.resolution')} options={live.image_sizes.map((s) => ({ value: s, label: s }))} value={size} onChange={setSize} />
        </Field>
      )}
      {live.qualities.length > 0 && (
        <Field label={t('image.quality')} group>
          <Segmented label={t('image.quality')} options={live.qualities.map((q) => ({ value: q, label: t(`image.quality_${q}`) }))} value={quality} onChange={setQuality} />
        </Field>
      )}
      {live.backgrounds.length > 0 && (
        <Field label={t('image.background')} group>
          <Segmented label={t('image.background')} options={live.backgrounds.map((b) => ({ value: b, label: t(`image.background_${b}`) }))} value={background} onChange={setBackground} />
        </Field>
      )}
      {live.output_formats.length > 0 && (
        <Field label={t('image.format')} group>
          <Segmented label={t('image.format')} options={live.output_formats.map((f) => ({ value: f, label: f.toUpperCase() }))} value={format} onChange={setFormat} />
        </Field>
      )}
      {live.reference_images > 0 && (
        <ImageList label={t('image.refsOptional')} max={live.reference_images} value={refs} onChange={setRefs} />
      )}
    </>
  )

  const footer = (
    <>
      <FieldError>{err}</FieldError>
      <Button block loading={busy} disabled={!prompt.trim()} onClick={run}>{busy ? t('image.creating') : t('image.create')}</Button>
      <small className="cost">{t('image.cost', { count: COST.image })}</small>
    </>
  )

  return (
    <SplitLayout id="image" title={t('studio.image')} icon="image" aside={form} footer={footer}>
      {loaded && !items.length && !busy && (
        <EmptyState title={t('image.emptyTitle')} text={t('image.emptyText')}>
          <SamplePrompts items={t('samples.image', { returnObjects: true })} onPick={setPrompt} />
        </EmptyState>
      )}
      <div className="grid">
        {busy && <PendingCard label={t('gen.makingImage')} prompt={prompt} negative={live.negative_prompt_key ? negative.trim() : ''} />}
        {items.map((g) => <GenerationCard key={g.id} gen={g} onOpen={setViewing} />)}
      </div>
      {viewing && <MediaViewer asset={viewing} onClose={() => setViewing(null)} />}
    </SplitLayout>
  )
}
