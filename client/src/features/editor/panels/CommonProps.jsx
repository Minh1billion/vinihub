import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import { Field } from '../../../components/Field.jsx'
import Select from '../../../components/Select.jsx'
import Slider from '../Slider.jsx'
import { BLEND_KEYS } from '../layers.js'

export default function CommonProps({ layer, patch, actions }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)
  return (
    <section className="ed-sec">
      <h4 className="ed-sec-title">{t('editor.group.layer')}</h4>
      <div className="ed-grid2">
        <Slider label={t('editor.layer.rotation')} icon="rotate" min={-180} max={180} value={Math.round(layer.rotation)} onChange={(v) => set({ rotation: v }, `rotation:${layer.id}`)} />
        <Slider label={t('editor.layer.opacity')} icon="contrast" min={5} max={100} value={Math.round(layer.opacity * 100)} onChange={(v) => set({ opacity: v / 100 }, `opacity:${layer.id}`)} />
      </div>
      <Field label={t('editor.layers.blend')} group>
        <Select popClassName="ed-theme" label={t('editor.layers.blend')} value={layer.blend || 'normal'} onChange={(v) => set({ blend: v })}
          options={BLEND_KEYS.map((k) => ({ value: k, label: t(`editor.layers.blends.${k}`) }))} />
      </Field>
      {actions && (
        <Field label={t('editor.layers.order')} group>
          <div className="ed-btnrow ed-btnrow--4">
            {[['toBack', () => actions.place(layer.id, false)], ['down', () => actions.move(layer.id, -1)], ['up', () => actions.move(layer.id, 1)], ['toFront', () => actions.place(layer.id, true)]].map(([k, run]) => (
              <Button key={k} variant="ghost" size="sm" block icon={{ toBack: 'toBack', down: 'arrowDown', up: 'arrowUp', toFront: 'toFront' }[k]}
                data-tip={t(`editor.layers.${k}`)} aria-label={t(`editor.layers.${k}`)} onClick={run} />
            ))}
          </div>
        </Field>
      )}
    </section>
  )
}
