import { useTranslation } from 'react-i18next'
import Button from '../../../../../components/Button.jsx'
import { Field } from '../../../../../components/Field.jsx'
import Segmented from '../../../../../components/Segmented.jsx'
import RatioPicker from '../../../shared/components/RatioPicker.jsx'
import { RATIOS, fitRect, ratioOf } from '../../utils/edit.js'
import { FULL, orientedOf } from '../../utils/layers.js'

export default function CropLayerPanel({ layer, crop, setCrop, onApply, onCancel }) {
  const { t } = useTranslation()
  const o = orientedOf(layer)
  const { rect } = crop

  const pick = (key) => {
    const r = fitRect(ratioOf(key), { x: 0, y: 0, w: o.width, h: o.height })
    setCrop({ ratio: key, rect: { x: r.x / o.width, y: r.y / o.height, w: r.w / o.width, h: r.h / o.height } })
  }

  return (
    <section className="ed-sec">
      <h4 className="ed-sec-title">{t('editor.tool.crop')}</h4>
      <Field label={t('common.aspectRatio')} group>
        <Segmented label={t('common.aspectRatio')} value={crop.ratio ? '' : 'free'} onChange={() => setCrop({ ratio: null })}
          options={[{ value: 'free', label: t('editor.crop.free') }]} />
        <RatioPicker options={RATIOS} value={crop.ratio} onChange={pick} />
      </Field>
      <Field label={t('editor.crop.size')} group>
        <span className="num ed-readout">{Math.round(rect.w * o.width)} × {Math.round(rect.h * o.height)} px</span>
        <small>{t('editor.crop.hint')}</small>
      </Field>
      <Button variant="soft" size="sm" block icon="refresh" onClick={() => setCrop({ ratio: null, rect: FULL })}>{t('editor.crop.clear')}</Button>
      <div className="ed-btnrow ed-sticky">
        <Button size="sm" block icon="check" onClick={onApply}>{t('editor.crop.apply')}</Button>
        <Button variant="ghost" size="sm" block onClick={onCancel}>{t('editor.crop.cancel')}</Button>
      </div>
    </section>
  )
}
