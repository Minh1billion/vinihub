import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import { Field } from '../../../components/Field.jsx'
import Segmented from '../../../components/Segmented.jsx'
import Select from '../../../components/Select.jsx'
import Toggle from '../../../components/Toggle.jsx'
import Slider from '../Slider.jsx'
import { BLEND_KEYS } from '../edit.js'
import { IMAGE_WIDTH, TEXT_SIZE } from '../layers.js'

const pct = (v) => Math.round(v * 100)

export default function LayerProps({ layer, index, count, actions }) {
  const { t } = useTranslation()
  const patch = (change, key) => actions.patch(layer.id, change, key && `${key}:${layer.id}`)
  const isText = layer.type === 'text'

  return (
    <>
      <fieldset className="ed-lock ed-layerprops" disabled={layer.locked}>
        <Field label={t('editor.layers.name')}>
          <input type="text" value={layer.name} placeholder={isText ? layer.text.split('\n')[0] : t('editor.layers.image')}
            onChange={(e) => patch({ name: e.target.value }, 'name')} />
        </Field>

        {isText && (
          <>
            <Field label={t('editor.text.content')}>
              <textarea rows={3} value={layer.text} placeholder={t('editor.text.placeholder')} onChange={(e) => patch({ text: e.target.value }, 'text')} />
            </Field>
            <Field label={t('editor.text.color')}>
              <input type="color" className="ed-color" value={layer.color} onChange={(e) => patch({ color: e.target.value }, 'color')} />
            </Field>
            <Field label={t('editor.text.weight')} group>
              <Segmented label={t('editor.text.weight')} value={layer.weight} onChange={(v) => patch({ weight: v })}
                options={[{ value: 400, label: t('editor.text.regular') }, { value: 700, label: t('editor.text.bold') }]} />
            </Field>
            <div className="field"><Toggle checked={layer.outline} onChange={(v) => patch({ outline: v })} label={t('editor.text.outline')} /></div>
            <div className="field"><Toggle checked={layer.background} onChange={(v) => patch({ background: v })} label={t('editor.text.background')} /></div>
          </>
        )}

        {isText
          ? <Slider label={t('editor.layers.size')} min={pct(TEXT_SIZE.min)} max={pct(TEXT_SIZE.max)} value={Math.round(layer.size * 100)} onChange={(v) => patch({ size: v / 100 }, 'size')} />
          : <Slider label={t('editor.layers.size')} min={pct(IMAGE_WIDTH.min)} max={pct(IMAGE_WIDTH.max)} value={Math.round(layer.width * 100)} onChange={(v) => patch({ width: v / 100 }, 'size')} />}
        <Slider label={t('editor.layers.rotation')} min={-180} max={180} value={Math.round(layer.rotation)} onChange={(v) => patch({ rotation: v }, 'rotate')} />
        <Slider label={t('editor.layers.opacity')} min={0} max={100} value={Math.round(layer.opacity * 100)} onChange={(v) => patch({ opacity: v / 100 }, 'opacity')} />
        <Field label={t('editor.layers.blend')} group>
          <Select label={t('editor.layers.blend')} value={layer.blend} onChange={(v) => patch({ blend: v })}
            options={BLEND_KEYS.map((k) => ({ value: k, label: t(`editor.layers.blends.${k}`) }))} />
        </Field>
        <Field label={t('editor.layers.align')} group>
          <div className="ed-btnrow">
            <Button variant="ghost" size="sm" onClick={() => patch({ x: 0.5 })}>{t('editor.layers.centerH')}</Button>
            <Button variant="ghost" size="sm" onClick={() => patch({ y: 0.5 })}>{t('editor.layers.centerV')}</Button>
            <Button variant="ghost" size="sm" disabled={!layer.rotation} onClick={() => patch({ rotation: 0 })}>{t('editor.layers.straighten')}</Button>
          </div>
        </Field>
      </fieldset>
      <div className="ed-btnrow">
        <Button variant="ghost" size="sm" icon="chevron" className="ed-up" disabled={layer.locked || index === count - 1} onClick={() => actions.step(layer.id, 1)}>{t('editor.layers.forward')}</Button>
        <Button variant="ghost" size="sm" icon="chevron" disabled={layer.locked || index === 0} onClick={() => actions.step(layer.id, -1)}>{t('editor.layers.backward')}</Button>
        <Button variant="ghost" size="sm" icon="copy" onClick={() => actions.duplicate(layer.id)}>{t('editor.layers.duplicate')}</Button>
        <Button variant="danger" size="sm" icon="trash" disabled={layer.locked} onClick={() => actions.remove(layer.id)}>{t('editor.layers.remove')}</Button>
      </div>
    </>
  )
}
