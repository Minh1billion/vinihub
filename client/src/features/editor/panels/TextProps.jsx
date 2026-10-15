import { useTranslation } from 'react-i18next'
import { Field } from '../../../components/Field.jsx'
import Segmented from '../../../components/Segmented.jsx'
import Toggle from '../../../components/Toggle.jsx'
import Slider from '../Slider.jsx'
import CommonProps from './CommonProps.jsx'

export default function TextProps({ layer, patch }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)
  return (
    <>
      <section className="ed-sec">
        <Field label={t('editor.text.content')}>
          <textarea rows={3} value={layer.text} placeholder={t('editor.text.placeholder')} onChange={(e) => set({ text: e.target.value }, `text:${layer.id}`)} />
        </Field>
      </section>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.group.style')}</h4>
        <div className="ed-grid2">
          <Field label={t('editor.text.color')}>
            <input type="color" className="ed-color" value={layer.color} onChange={(e) => set({ color: e.target.value }, `color:${layer.id}`)} />
          </Field>
          <Field label={t('editor.text.weight')} group>
            <Segmented label={t('editor.text.weight')} value={layer.weight} onChange={(v) => set({ weight: v })}
              options={[{ value: 400, label: t('editor.text.regular') }, { value: 700, label: t('editor.text.bold') }]} />
          </Field>
        </div>
        <Slider label={t('editor.text.size')} min={8} max={600} value={Math.round(layer.size)} onChange={(v) => set({ size: v }, `size:${layer.id}`)} />
        <div className="ed-toggles">
          <Toggle checked={layer.outline} onChange={(v) => set({ outline: v })} label={t('editor.text.outline')} />
          <Toggle checked={layer.background} onChange={(v) => set({ background: v })} label={t('editor.text.background')} />
        </div>
      </section>
      <CommonProps layer={layer} patch={patch} />
    </>
  )
}
