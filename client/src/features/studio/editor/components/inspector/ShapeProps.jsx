import { useTranslation } from 'react-i18next'
import Icon from '../../../../../components/Icon.jsx'
import { Field } from '../../../../../components/Field.jsx'
import Segmented from '../../../../../components/Segmented.jsx'
import Toggle from '../../../../../components/Toggle.jsx'
import Slider from '../Slider.jsx'
import { SHAPE_COLORS, SHAPE_ICONS, SHAPE_KINDS, SHAPE_RATIO } from '../../utils/layers.js'
import CommonProps from './CommonProps.jsx'

export default function ShapeProps({ layer, patch, actions }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)
  const line = layer.kind === 'line'

  const setKind = (kind) => {
    if (kind === layer.kind) return
    if (kind === 'line') set({ kind, stroke: layer.fill || layer.stroke || SHAPE_COLORS.fill, strokeWidth: Math.max(4, layer.strokeWidth || 0, Math.round(layer.w * 0.03)), fill: null })
    else set({ kind, fill: line ? layer.stroke || SHAPE_COLORS.fill : layer.fill, strokeWidth: line ? 0 : layer.strokeWidth, h: line ? Math.round(layer.w * (SHAPE_RATIO[kind] || 1)) : layer.h })
  }

  return (
    <>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.group.shape')}</h4>
        <Field label={t('editor.shape.kind')} group>
          <Segmented className="ed-shapes" label={t('editor.shape.kind')} value={layer.kind} onChange={setKind}
            options={SHAPE_KINDS.map((k) => ({ value: k, label: <Icon name={SHAPE_ICONS[k]} size={20} />, tip: t(`editor.shape.${k}`) }))} />
        </Field>
        <Slider label={t('editor.shape.width')} min={4} max={3000} value={Math.round(layer.w)} onChange={(v) => set({ w: v }, `w:${layer.id}`)} />
        {!line && <Slider label={t('editor.shape.height')} min={4} max={3000} value={Math.round(layer.h)} onChange={(v) => set({ h: v }, `h:${layer.id}`)} />}
      </section>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.group.style')}</h4>
        {!line && (
          <div className="ed-grid2">
            <Toggle checked={Boolean(layer.fill)} onChange={(v) => set({ fill: v ? SHAPE_COLORS.fill : null })} label={t('editor.shape.fill')} />
            <input type="color" className="ed-color" disabled={!layer.fill} value={layer.fill || SHAPE_COLORS.fill} onChange={(e) => set({ fill: e.target.value }, `fill:${layer.id}`)} />
          </div>
        )}
        {!line && layer.fill && (
          <div className="ed-grid2">
            <Segmented label={t('editor.shape.fillType')} value={layer.gradient ? 'gradient' : 'solid'}
              onChange={(v) => set(v === 'gradient' ? { gradient: true, fill2: layer.fill2 || SHAPE_COLORS.fill2, angle: layer.angle ?? 90 } : { gradient: false })}
              options={[{ value: 'solid', label: <Icon name="solid" size={20} />, tip: t('editor.shape.solid') }, { value: 'gradient', label: <Icon name="gradient" size={20} />, tip: t('editor.shape.gradient') }]} />
            <input type="color" className="ed-color" disabled={!layer.gradient} value={layer.fill2 || SHAPE_COLORS.fill2} onChange={(e) => set({ fill2: e.target.value }, `fill2:${layer.id}`)} aria-label={t('editor.shape.gradientEnd')} data-tip={t('editor.shape.gradientEnd')} />
          </div>
        )}
        {!line && layer.fill && layer.gradient && (
          <Slider label={t('editor.shape.angle')} min={0} max={360} value={Math.round(layer.angle ?? 90)} onChange={(v) => set({ angle: v }, `angle:${layer.id}`)} />
        )}
        <div className="ed-grid2">
          <Field label={t('editor.shape.stroke')}>
            <input type="color" className="ed-color" value={layer.stroke || SHAPE_COLORS.stroke} onChange={(e) => set({ stroke: e.target.value }, `stroke:${layer.id}`)} />
          </Field>
          <Slider label={t('editor.shape.strokeWidth')} min={line ? 1 : 0} max={120} value={Math.round(layer.strokeWidth || 0)} onChange={(v) => set({ strokeWidth: v }, `sw:${layer.id}`)} />
        </div>
        {layer.kind === 'rect' && <Slider label={t('editor.shape.radius')} min={0} max={100} value={layer.radius || 0} onChange={(v) => set({ radius: v }, `r:${layer.id}`)} />}
      </section>
      <CommonProps layer={layer} patch={patch} actions={actions} />
    </>
  )
}
