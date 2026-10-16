import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import { Dropzone, MediaViewer } from '@/features/library'
import EmptyState, { SamplePrompts } from '@/shared/ui/EmptyState.jsx'
import { Field, FieldError } from '@/shared/ui/Field.jsx'
import ImageList from '../components/ImageList.jsx'
import { ModelSelect, useModelCaps } from '@/features/models'
import RatioPicker from '@/shared/ui/RatioPicker.jsx'
import Segmented from '@/shared/ui/Segmented.jsx'
import Select from '@/shared/ui/Select.jsx'
import Toggle from '@/shared/ui/Toggle.jsx'
import { COST } from '@/features/billing'
import GenerationCard from '../components/GenerationCard.jsx'
import MotionControl from './components/MotionControl.jsx'
import SplitLayout from '@/shared/ui/SplitLayout.jsx'
import { useGenerations } from '../hooks/useGenerations.js'

const pick = (list, value, prefer) => (list.includes(value) ? value : list.includes(prefer) ? prefer : list[0] ?? '')

export default function VideoPanel({ prompt, setPrompt, frame, onFrameUsed }) {
  const { t } = useTranslation()
  const { wid, refreshSubscription } = useApp()
  const { items, add, loaded } = useGenerations('video')
  const [model, setModel] = useState('')
  const caps = useModelCaps('video', model)
  const [duration, setDuration] = useState(5)
  const [resolution, setResolution] = useState('')
  const [ratio, setRatio] = useState('16:9')
  const [inputMode, setInputMode] = useState('frames')
  const [firstFrame, setFirstFrame] = useState(null)
  const [lastFrame, setLastFrame] = useState(null)
  const [refs, setRefs] = useState([])
  const [audio, setAudio] = useState(true)
  const [seed, setSeed] = useState('')
  const [negative, setNegative] = useState('')
  const [motionOn, setMotionOn] = useState(false)
  const [motion, setMotion] = useState(null)
  const [mode, setMode] = useState('video')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [viewing, setViewing] = useState(null)

  const canFirst = caps.frame_images.includes('first_frame')
  const canLast = caps.frame_images.includes('last_frame')
  const canFrames = canFirst || canLast
  const canRefs = caps.reference_images > 0
  const canNegative = Boolean(caps.negative_prompt_key)
  const input = canFrames && canRefs ? inputMode : canFrames ? 'frames' : canRefs ? 'refs' : 'none'
  const showMotion = caps.motion_control && canFirst && input === 'frames'
  const motionIncomplete = showMotion && motionOn && (!firstFrame || !motion)

  useEffect(() => {
    setDuration((d) => (caps.durations.length ? pick(caps.durations, d, 5) : null))
    setResolution((r) => (caps.resolutions.length ? pick(caps.resolutions, r, '720p') : ''))
    setRatio((r) => (caps.aspect_ratios.length ? pick(caps.aspect_ratios, r, '16:9') : ''))
    if (!canFirst) setFirstFrame(null)
    if (!canLast) setLastFrame(null)
    setRefs((r) => (r.length > caps.reference_images ? r.slice(0, caps.reference_images) : r))
    if (!caps.seed) setSeed('')
    if (!caps.negative_prompt_key) setNegative('')
    if (!caps.motion_control) { setMotionOn(false); setMotion(null) }
  }, [caps, canFirst, canLast])

  useEffect(() => {
    if (!frame || !canFirst) return
    setInputMode('frames')
    setFirstFrame(frame)
    onFrameUsed()
  }, [frame, canFirst])

  const toggleMotion = (on) => { setMotionOn(on); if (!on) setMotion(null) }

  const run = async () => {
    setBusy(true); setErr('')
    const frames = input === 'frames'
    try {
      add(await api.post(`/workspaces/${wid}/videos`, {
        prompt, model: model || undefined,
        duration: caps.durations.length ? duration : undefined,
        resolution: caps.resolutions.length ? resolution : undefined,
        aspect_ratio: caps.aspect_ratios.length ? ratio : undefined,
        first_frame_asset_id: frames ? firstFrame?.id || null : null,
        last_frame_asset_id: frames ? lastFrame?.id || null : null,
        reference_asset_ids: input === 'refs' ? refs.map((r) => r.id) : [],
        motion_asset_id: showMotion && motionOn ? motion?.id || null : null,
        motion_mode: mode,
        generate_audio: caps.audio ? audio : undefined,
        seed: caps.seed && seed !== '' ? Number(seed) : undefined,
        negative_prompt: canNegative && negative.trim() ? negative.trim() : undefined,
      }))
      refreshSubscription()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const durationOptions = caps.durations.map((d) => ({ value: d, label: t('video.seconds', { count: d }) }))
  const inputModes = [
    { value: 'frames', label: t('video.inputFrames') },
    { value: 'refs', label: t('common.referenceImages') },
  ]

  const form = (
    <>
      <Field label={t('video.promptLabel')}>
        <textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
          placeholder={t('video.promptPlaceholder')} />
      </Field>
      <Field label={t('common.model')}><ModelSelect kind="video" value={model} onChange={setModel} /></Field>
      {canNegative && (
        <Field label={t('video.negativeLabel')} hint={t('video.negativeHint')}>
          <textarea rows={2} maxLength={1000} value={negative} placeholder={t('video.negativePlaceholder')} onChange={(e) => setNegative(e.target.value)} />
        </Field>
      )}

      <div className="field-row">
        {durationOptions.length > 0 && (durationOptions.length <= 5 ? (
          <Field label={t('common.duration')} group><Segmented label={t('common.duration')} options={durationOptions} value={duration} onChange={setDuration} /></Field>
        ) : (
          <Field label={t('common.duration')}><Select label={t('common.duration')} searchable={false} options={durationOptions} value={duration} onChange={setDuration} /></Field>
        ))}
        {caps.resolutions.length > 0 && (
          <Field label={t('common.resolution')} group>
            <Segmented label={t('common.resolution')} options={caps.resolutions.map((r) => ({ value: r, label: r }))} value={resolution} onChange={setResolution} />
          </Field>
        )}
      </div>
      {caps.aspect_ratios.length > 0 && (
        <Field label={t('common.aspectRatio')} group><RatioPicker options={caps.aspect_ratios} value={ratio} onChange={setRatio} /></Field>
      )}

      {canFrames && canRefs && (
        <Field label={t('video.inputImages')} group><Segmented label={t('video.inputImages')} options={inputModes} value={inputMode} onChange={setInputMode} /></Field>
      )}
      {input === 'frames' && (
        <div className={'frames' + (canFirst && canLast ? ' two' : '')}>
          {canFirst && <Dropzone compact accept="image/*" label={canLast ? t('video.firstFrame') : t('video.firstOrCharacter')}
            cta={t('video.pickImage')} value={firstFrame} onChange={setFirstFrame} />}
          {canLast && <Dropzone compact accept="image/*" label={t('video.lastFrame')} cta={t('video.pickImage')} value={lastFrame} onChange={setLastFrame} />}
        </div>
      )}
      {input === 'refs' && (
        <ImageList label={t('common.referenceImages')} max={caps.reference_images} value={refs} onChange={setRefs} />
      )}

      {showMotion && (
        <MotionControl enabled={motionOn} onToggle={toggleMotion} motion={motion} setMotion={setMotion}
          mode={mode} setMode={setMode} hasFrame={Boolean(firstFrame)} />
      )}
      {caps.audio && (
        <div className="field"><Toggle checked={audio} onChange={setAudio} label={t('video.audio')} /></div>
      )}
      {caps.seed && (
        <details className="adv">
          <summary>{t('video.advanced')}</summary>
          <Field label={t('video.seedLabel')} hint={t('video.seedHint')}>
            <input type="number" min="0" inputMode="numeric" value={seed} placeholder={t('video.seedPlaceholder')} onChange={(e) => setSeed(e.target.value)} />
          </Field>
        </details>
      )}

    </>
  )

  const footer = (
    <>
      <FieldError>{err}</FieldError>
      <Button block loading={busy} disabled={!prompt.trim() || motionIncomplete} onClick={run}>{t('video.create')}</Button>
      <small className="cost">{t('video.cost', { count: COST.video })}</small>
    </>
  )

  return (
    <SplitLayout id="video" title={t('studio.video')} icon="video" aside={form} footer={footer}>
      {loaded && !items.length && (
        <EmptyState title={t('video.emptyTitle')} text={t('video.emptyText')}>
          <SamplePrompts items={t('samples.video', { returnObjects: true })} onPick={setPrompt} />
        </EmptyState>
      )}
      <div className="grid">
        {items.map((g) => <GenerationCard key={g.id} gen={g} onOpen={setViewing} />)}
      </div>
      {viewing && <MediaViewer asset={viewing} onClose={() => setViewing(null)} />}
    </SplitLayout>
  )
}
