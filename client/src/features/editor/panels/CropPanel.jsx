import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import { Field } from '../../../components/Field.jsx'
import RatioPicker from '../../studio/shared/RatioPicker.jsx'
import Segmented from '../../../components/Segmented.jsx'
import { PLATFORM_PRESETS, RATIOS, fitRatio, ratioValue, rectOf } from '../edit.js'

export default function CropPanel({ edit, commit, oriented, ratioKey, setRatioKey, presetKey, setPresetKey }) {
  const { t } = useTranslation()
  const size = rectOf(oriented, edit.crop)
  const preset = PLATFORM_PRESETS.find((p) => p.key === presetKey)

  const reorient = (change, swap) => {
    const w = swap ? oriented.height : oriented.width
    const h = swap ? oriented.width : oriented.height
    const ratio = ratioValue(ratioKey, w, h)
    commit((e) => ({ ...change(e), crop: ratio ? fitRatio(ratio, w, h) : null }))
  }

  const rotate = (dir) => reorient((e) => ({ ...e, rotate: (e.rotate + dir * 90 + 360) % 360 }), true)
  const flip = (key) => reorient((e) => ({ ...e, [key]: !e[key] }), false)

  const apply = (key) => {
    setRatioKey(key)
    const ratio = ratioValue(key, oriented.width, oriented.height)
    commit((e) => ({ ...e, crop: ratio ? fitRatio(ratio, oriented.width, oriented.height) : e.crop }))
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
      <Field label={t('editor.crop.orientation')} group>
        <div className="ed-btnrow">
          <Button variant="ghost" size="sm" icon="rotate" onClick={() => rotate(-1)}>{t('editor.crop.rotateLeft')}</Button>
          <Button variant="ghost" size="sm" icon="rotate" className="ed-mirror" onClick={() => rotate(1)}>{t('editor.crop.rotateRight')}</Button>
          <Button variant="ghost" size="sm" icon="flip" onClick={() => flip('flipH')}>{t('editor.crop.flipH')}</Button>
          <Button variant="ghost" size="sm" icon="flip" className="ed-vert" onClick={() => flip('flipV')}>{t('editor.crop.flipV')}</Button>
        </div>
      </Field>
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
              className={'chip ed-preset' + (p.key === presetKey ? ' on' : '')} onClick={() => applyPreset(p)}>
              {t(`sim.platform.${p.platform}`)} · {t(`sim.format.${p.format}`)}
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
      <Button variant="ghost" size="sm" disabled={!edit.crop} onClick={clear}>{t('editor.crop.clear')}</Button>
    </>
  )
}
