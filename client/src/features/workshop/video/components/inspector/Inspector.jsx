import { useTranslation } from 'react-i18next'
import Button from '@/shared/ui/Button.jsx'
import { Field } from '@/shared/ui/Field.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Select from '@/shared/ui/Select.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import Slider from '../../../shared/controls/Slider.jsx'
import { keyClipTime, keyIndex, lookAt } from '../../utils/keyframes.js'
import { BLENDS, DEFAULT_LOOK, formatTime } from '../../utils/project.js'

const ROWS = [
  ['x', -100, 100, 'alignCH'],
  ['y', -100, 100, 'alignCV'],
  ['scale', 10, 300, 'scale'],
  ['rotation', -180, 180, 'rotate'],
  ['opacity', 0, 100, 'transparent'],
]

export default function Inspector({ selection, time, onPatch, onReset, onKey, onSeek }) {
  const { t } = useTranslation()
  const clip = selection?.clip
  const locked = Boolean(selection?.track.locked)
  const look = clip ? lookAt(clip, time) : null
  const keys = clip?.keys || []
  const marked = clip ? keyIndex(clip, time) >= 0 : false
  const reach = clip ? time >= clip.start && time <= clip.start + clip.duration : false
  const changed = look ? keys.length > 0 || Object.keys(DEFAULT_LOOK).some((key) => look[key] !== DEFAULT_LOOK[key]) : false
  return (
    <aside className="ed-props vd-props" aria-label={t('videoEditor.inspector.title')}>
      <header className="ed-ihead">
        <span className="ed-ihead-ic"><Icon name={selection?.track.kind === 'audio' ? 'music' : 'video'} size={18} /></span>
        <strong className="ed-name">{clip ? clip.name : t('videoEditor.inspector.title')}</strong>
      </header>
      <div className="ed-ibody">
        {clip ? (
          <>
            <section className="ed-sec">
              <div className="ed-sec-head">
                <h4 className="ed-sec-title">{t('videoEditor.inspector.title')}</h4>
              </div>
              <dl className="vd-facts">
                <dt>{t('videoEditor.inspector.start')}</dt><dd className="num">{formatTime(clip.start)}</dd>
                <dt>{t('videoEditor.inspector.duration')}</dt><dd className="num">{formatTime(clip.duration)}</dd>
              </dl>
            </section>
            <section className="ed-sec">
              <div className="ed-sec-head">
                <h4 className="ed-sec-title">{t('videoEditor.inspector.transform')}</h4>
              </div>
              {locked && <small>{t('videoEditor.inspector.locked')}</small>}
              <fieldset className="vd-fields" disabled={locked}>
                {ROWS.map(([key, min, max, icon]) => (
                  <Slider key={key} label={t(`videoEditor.inspector.${key}`)} min={min} max={max} value={look[key]}
                    onChange={(value) => onPatch(clip.id, { [key]: value })} icon={icon} />
                ))}
                <Field label={t('editor.layers.blend')} group>
                  <Select popClassName="ed-theme" label={t('editor.layers.blend')} value={look.blend} disabled={locked}
                    onChange={(value) => onPatch(clip.id, { blend: value })}
                    options={BLENDS.map((k) => ({ value: k, label: t(`editor.layers.blends.${k}`) }))} />
                </Field>
              </fieldset>
              <Button variant="soft" size="sm" block icon="refresh" disabled={locked || !changed} onClick={() => onReset(clip.id)}>
                {t('videoEditor.inspector.reset')}
              </Button>
            </section>
            <section className="ed-sec">
              <div className="ed-sec-head">
                <h4 className="ed-sec-title">{t('videoEditor.inspector.keyframes')}</h4>
              </div>
              <Button variant="soft" size="sm" block icon="diamond" disabled={locked || (!reach && !marked)} onClick={() => onKey(clip.id)}>
                {marked ? t('videoEditor.inspector.removeKey') : t('videoEditor.inspector.addKey')}
              </Button>
              {keys.length ? (
                <ul className="vd-keys">
                  {keys.map((k) => (
                    <li key={k.t}>
                      <button type="button" className="vd-key-chip num" onClick={() => onSeek(keyClipTime(clip, k))}>{formatTime(keyClipTime(clip, k))}</button>
                    </li>
                  ))}
                </ul>
              ) : <small>{t('videoEditor.inspector.noKeys')}</small>}
            </section>
          </>
        ) : (
          <EmptyState title={t('videoEditor.inspector.emptyTitle')} text={t('videoEditor.inspector.emptyText')} />
        )}
      </div>
    </aside>
  )
}
