import { useTranslation } from 'react-i18next'
import Dropzone from '../../../components/Dropzone.jsx'
import Segmented from '../../../components/Segmented.jsx'
import Toggle from '../../../components/Toggle.jsx'
import { Field } from '../../../components/Field.jsx'

export default function MotionControl({ enabled, onToggle, motion, setMotion, mode, setMode, hasFrame }) {
  const { t } = useTranslation()
  const modes = [
    { value: 'video', label: t('motion.byVideo') },
    { value: 'image', label: t('motion.byImage') },
  ]
  return (
    <div className={'motion' + (enabled ? ' open' : '')}>
      <Toggle checked={enabled} onChange={onToggle} label={t('motion.toggle')} />
      {enabled ? (
        <div className="motion-body">
          {!hasFrame && <p className="hint">{t('motion.needFrame')}</p>}
          <Dropzone accept="video/*" label={t('motion.dropLabel')} value={motion} onChange={setMotion} />
          <Field label={t('motion.orientation')} group>
            <Segmented label={t('motion.orientation')} options={modes} value={mode} onChange={setMode} />
          </Field>
        </div>
      ) : (
        <small>{t('motion.help')}</small>
      )}
    </div>
  )
}
