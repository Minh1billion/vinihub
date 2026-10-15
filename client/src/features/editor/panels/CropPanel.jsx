import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import { Field } from '../../../components/Field.jsx'
import PlatformLogo from '../../simulator/PlatformLogo.jsx'
import RatioPicker from '../../studio/shared/RatioPicker.jsx'
import Segmented from '../../../components/Segmented.jsx'
import { PLATFORM_PRESETS, RATIOS, fitRatio, ratioValue, rectOf } from '../edit.js'

export default function CropPanel({ edit, commit, canvas, ratioKey, setRatioKey, presetKey, setPresetKey }) {
  const { t } = useTranslation()
  const size = rectOf(canvas, edit.crop)
  const preset = PLATFORM_PRESETS.find((p) => p.key === presetKey)

  const apply = (key) => {
    setRatioKey(key)
    const ratio = ratioValue(key, canvas.width, canvas.height)
    commit((e) => ({ ...e, crop: ratio ? fitRatio(ratio, canvas.width, canvas.height) : e.crop }))
  }

  const pick = (key) => {
    setPresetKey(null)
    apply(key)
  }

  const applyPreset = (p) => {
    setPresetKey(p.key)
    apply(p.ratio)
  }

  const clear = () => {
    setPresetKey(null)
    setRatioKey('free')
    commit((e) => ({ ...e, crop: null }))
  }

  return (
    <>
      <Field label={t('common.aspectRatio')} group>
        <Segmented label={t('common.aspectRatio')} value={ratioKey === 'free' || ratioKey === 'orig' ? ratioKey : ''} onChange={pick}
          options={[{ value: 'free', label: t('editor.crop.free') }, { value: 'orig', label: t('editor.crop.original') }]} />
        <RatioPicker options={RATIOS} value={ratioKey} onChange={pick} />
        <small>{t('editor.crop.platforms')}</small>
      </Field>
      <Field label={t('editor.crop.presets')} group>
        <div className="ed-presets" role="radiogroup" aria-label={t('editor.crop.presets')}>
          {PLATFORM_PRESETS.map((p) => (
            <button key={p.key} type="button" role="radio" aria-checked={p.key === presetKey}
              className={'ed-preset' + (p.key === presetKey ? ' on' : '')} onClick={() => applyPreset(p)}>
              <PlatformLogo platform={p.platform} size={26} />
              <span className="ed-pname">
                <b>{t(`sim.platform.${p.platform}`)}</b>
                <small>{t(`sim.format.${p.format}`)} · {p.ratio}</small>
              </span>
            </button>
          ))}
        </div>
        {preset && <small>{t('editor.crop.presetSize', { w: preset.w, h: preset.h })}</small>}
        {preset && size.w < preset.w && <small className="ed-warn">{t('editor.crop.presetSmall')}</small>}
      </Field>
      <Field label={t('editor.crop.size')} group>
        <span className="num ed-readout">{size.w} × {size.h} px</span>
        <small>{t('editor.crop.hint')}</small>
      </Field>
      <Button variant="ghost" size="sm" block icon="refresh" disabled={!edit.crop} onClick={clear}>{t('editor.crop.clear')}</Button>
    </>
  )
}
