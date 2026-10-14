import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import { Field } from '../../../components/Field.jsx'
import RatioPicker from '../../studio/shared/RatioPicker.jsx'
import Segmented from '../../../components/Segmented.jsx'
import { RATIOS, fitRatio, ratioValue, rectOf } from '../edit.js'

export default function CropPanel({ edit, commit, oriented, ratioKey, setRatioKey }) {
  const { t } = useTranslation()
  const size = rectOf(oriented, edit.crop)

  const reorient = (change, swap) => {
    const w = swap ? oriented.height : oriented.width
    const h = swap ? oriented.width : oriented.height
    const ratio = ratioValue(ratioKey, w, h)
    commit((e) => ({ ...change(e), crop: ratio ? fitRatio(ratio, w, h) : null }))
  }

  const rotate = (dir) => reorient((e) => ({ ...e, rotate: (e.rotate + dir * 90 + 360) % 360 }), true)
  const flip = (key) => reorient((e) => ({ ...e, [key]: !e[key] }), false)

  const pick = (key) => {
    setRatioKey(key)
    const ratio = ratioValue(key, oriented.width, oriented.height)
    commit((e) => ({ ...e, crop: ratio ? fitRatio(ratio, oriented.width, oriented.height) : e.crop }))
  }

  const clear = () => {
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
      <Field label={t('editor.crop.size')} group>
        <span className="num ed-readout">{size.w} × {size.h} px</span>
        <small>{t('editor.crop.hint')}</small>
      </Field>
      <Button variant="ghost" size="sm" disabled={!edit.crop} onClick={clear}>{t('editor.crop.clear')}</Button>
    </>
  )
}
