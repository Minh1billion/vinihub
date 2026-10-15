import { useTranslation } from 'react-i18next'
import { Field } from '../../../components/Field.jsx'
import Segmented from '../../../components/Segmented.jsx'
import Toggle from '../../../components/Toggle.jsx'
import Slider from '../Slider.jsx'
import { SHAPE_KINDS } from '../layers.js'
import CommonProps from './CommonProps.jsx'

export default function ShapeProps({ layer, patch, actions }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)
  const line = layer.kind === 'line'

  const setKind = (kind) => {
    if (kind === layer.kind) return
    if (kind === 'line') set({ kind, stroke: layer.fill || layer.stroke || '#ff6a13', strokeWidth: Math.max(4, layer.strokeWidth || 0, Math.round(layer.w * 0.03)), fill: null })
    else set({ kind, fill: line ? layer.stroke || '#ff6a13' : layer.fill, strokeWidth: line ? 0 : layer.strokeWidth, h: line ? Math.round(layer.w * 0.6) : layer.h })
  }

  return (
    <>
      <section className="ed-sec">
        <Field label={t('editor.shape.kind')} group>
          <Segmented label={t('editor.shape.kind')} value={layer.kind} onChange={setKind}
            options={SHAPE_KINDS.map((k) => ({ value: k, label: t(`editor.shape.${k}`) }))} />
        </Field>
        <Slider label={t('editor.shape.width')} min={4} max={3000} value={Math.round(layer.w)} onChange={(v) => set({ w: v }, `w:${layer.id}`)} />
        {!line && <Slider label={t('editor.shape.height')} min={4} max={3000} value={Math.round(layer.h)} onChange={(v) => set({ h: v }, `h:${layer.id}`)} />}
      </section>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.group.style')}</h4>
        {!line && (
          <div className="ed-grid2">
            <Toggle checked={Boolean(layer.fill)} onChange={(v) => set({ fill: v ? '#ff6a13' : null })} label={t('editor.shape.fill')} />
            <input type="color" className="ed-color" disabled={!layer.fill} value={layer.fill || '#ff6a13'} onChange={(e) => set({ fill: e.target.value }, `fill:${layer.id}`)} />
          </div>
        )}
        <div className="ed-grid2">
          <Field label={t('editor.shape.stroke')}>
            <input type="color" className="ed-color" value={layer.stroke || '#000000'} onChange={(e) => set({ stroke: e.target.value }, `stroke:${layer.id}`)} />
          </Field>
          <Slider label={t('editor.shape.strokeWidth')} min={line ? 1 : 0} max={120} value={Math.round(layer.strokeWidth || 0)} onChange={(v) => set({ strokeWidth: v }, `sw:${layer.id}`)} />
        </div>
        {layer.kind === 'rect' && <Slider label={t('editor.shape.radius')} min={0} max={100} value={layer.radius || 0} onChange={(v) => set({ radius: v }, `r:${layer.id}`)} />}
      </section>
      <CommonProps layer={layer} patch={patch} actions={actions} />
    </>
  )
}
