import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/Field.jsx'
import Segmented from '@/shared/ui/Segmented.jsx'
import Select from '@/shared/ui/Select.jsx'
import Toggle from '@/shared/ui/Toggle.jsx'
import Slider from '../controls/Slider.jsx'
import { FONT_KEYS } from '../../utils/layers.js'
import CommonProps from './CommonProps.jsx'

export default function TextProps({ layer, patch, actions }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)
  return (
    <>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.text.content')}</h4>
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
        <Field label={t('editor.text.font')} group>
          <Select popClassName="ed-theme" label={t('editor.text.font')} value={layer.font || 'sans'} onChange={(v) => set({ font: v })}
            options={FONT_KEYS.map((k) => ({ value: k, label: t(`editor.text.fonts.${k}`) }))} />
        </Field>
        <Field label={t('editor.text.align')} group>
          <Segmented label={t('editor.text.align')} value={layer.align || 'center'} onChange={(v) => set({ align: v })}
            options={['left', 'center', 'right'].map((k) => ({ value: k, label: t(`editor.text.${k}`) }))} />
        </Field>
        <Slider label={t('editor.text.size')} min={8} max={600} value={Math.round(layer.size)} onChange={(v) => set({ size: v }, `size:${layer.id}`)} />
        <div className="ed-grid2">
          <Slider label={t('editor.text.spacing')} min={-10} max={60} value={layer.spacing || 0} onChange={(v) => set({ spacing: v }, `spacing:${layer.id}`)} />
          <Slider label={t('editor.text.lineHeight')} min={80} max={220} value={Math.round((layer.lineHeight || 1.2) * 100)} onChange={(v) => set({ lineHeight: v / 100 }, `lh:${layer.id}`)} />
        </div>
        <div className="ed-toggles">
          <Toggle checked={layer.outline} onChange={(v) => set({ outline: v })} label={t('editor.text.outline')} />
          <Toggle checked={layer.background} onChange={(v) => set({ background: v })} label={t('editor.text.background')} />
          <Toggle checked={Boolean(layer.shadow)} onChange={(v) => set({ shadow: v })} label={t('editor.text.shadow')} />
        </div>
        {layer.outline && (
          <div className="ed-grid2">
            <Field label={t('editor.text.outlineColor')}>
              <input type="color" className="ed-color" value={layer.outlineColor || '#000000'} onChange={(e) => set({ outlineColor: e.target.value }, `oc:${layer.id}`)} />
            </Field>
            <Slider label={t('editor.text.outlineWidth')} min={1} max={40} value={layer.outlineWidth ?? 14} onChange={(v) => set({ outlineWidth: v }, `ow:${layer.id}`)} />
          </div>
        )}
      </section>
      <CommonProps layer={layer} patch={patch} actions={actions} />
    </>
  )
}
