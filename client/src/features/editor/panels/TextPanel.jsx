import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import { Field } from '../../../components/Field.jsx'
import Segmented from '../../../components/Segmented.jsx'
import Toggle from '../../../components/Toggle.jsx'
import Slider from '../Slider.jsx'

const uid = () => Math.random().toString(36).slice(2, 10)

export default function TextPanel({ edit, commit, selected, onSelect }) {
  const { t } = useTranslation()
  const sel = edit.texts.find((x) => x.id === selected)

  const add = () => {
    const layer = { id: uid(), text: t('editor.text.default'), x: 0.5, y: 0.5, size: 0.08, color: '#ffffff', weight: 700, outline: true, background: false }
    commit((e) => ({ ...e, texts: [...e.texts, layer] }))
    onSelect(layer.id)
  }

  const patch = (change, key) => commit((e) => ({ ...e, texts: e.texts.map((x) => (x.id === selected ? { ...x, ...change } : x)) }), key)

  const remove = () => {
    commit((e) => ({ ...e, texts: e.texts.filter((x) => x.id !== selected) }))
    onSelect(null)
  }

  return (
    <>
      <Button variant="soft" size="sm" icon="plus" onClick={add}>{t('editor.text.add')}</Button>
      {edit.texts.length > 0 ? (
        <div className="ed-layers">
          {edit.texts.map((x) => (
            <button key={x.id} type="button" className={'ed-layer' + (x.id === selected ? ' on' : '')} onClick={() => onSelect(x.id)}>
              {x.text.split('\n')[0] || t('editor.text.empty')}
            </button>
          ))}
        </div>
      ) : <small>{t('editor.text.hint')}</small>}
      {sel && (
        <>
          <Field label={t('editor.text.content')}>
            <textarea rows={3} value={sel.text} placeholder={t('editor.text.placeholder')} onChange={(e) => patch({ text: e.target.value }, `text:${sel.id}`)} />
          </Field>
          <Field label={t('editor.text.color')}>
            <input type="color" className="ed-color" value={sel.color} onChange={(e) => patch({ color: e.target.value }, `color:${sel.id}`)} />
          </Field>
          <Slider label={t('editor.text.size')} min={2} max={30} value={Math.round(sel.size * 100)} onChange={(v) => patch({ size: v / 100 }, `size:${sel.id}`)} />
          <Field label={t('editor.text.weight')} group>
            <Segmented label={t('editor.text.weight')} value={sel.weight} onChange={(v) => patch({ weight: v })}
              options={[{ value: 400, label: t('editor.text.regular') }, { value: 700, label: t('editor.text.bold') }]} />
          </Field>
          <div className="field"><Toggle checked={sel.outline} onChange={(v) => patch({ outline: v })} label={t('editor.text.outline')} /></div>
          <div className="field"><Toggle checked={sel.background} onChange={(v) => patch({ background: v })} label={t('editor.text.background')} /></div>
          <Button variant="danger" size="sm" icon="trash" onClick={remove}>{t('editor.text.remove')}</Button>
        </>
      )}
      {edit.texts.length > 0 && <small>{t('editor.text.hint')}</small>}
    </>
  )
}
