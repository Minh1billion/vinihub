import { useTranslation } from 'react-i18next'
import Icon from '../../../../../components/Icon.jsx'
import Segmented from '../../../../../components/Segmented.jsx'
import Slider from '../Slider.jsx'
import { skewOf, sourceOf } from '../../utils/layers.js'
import CommonProps from './CommonProps.jsx'

export default function ImageProps({ layer, patch, actions }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)

  const natural = sourceOf(layer).width
  const stretch = Boolean(layer.stretch)
  const widthPct = Math.round((layer.w / natural) * 100)
  const heightPct = Math.round((layer.w / natural) * skewOf(layer) * 100)
  const resize = (v) => {
    const w = (v / 100) * natural
    set({ w, sy: (skewOf(layer) * layer.w) / w }, `w:${layer.id}`)
  }

  return (
    <>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.group.size')}</h4>
        <Segmented label={t('editor.image.render')} value={stretch ? 'stretch' : 'scale'}
          onChange={(v) => set(v === 'stretch' ? { stretch: true } : { stretch: false, sy: 1 })}
          options={[
            { value: 'scale', label: <Icon name="scale" size={16} />, tip: t('editor.image.mode.scale') },
            { value: 'stretch', label: <Icon name="stretchX" size={16} />, tip: t('editor.image.mode.stretch') },
          ]} />
        {stretch ? (
          <div className="ed-grid2">
            <Slider label={t('editor.image.width')} min={1} max={800} value={widthPct} onChange={resize} />
            <Slider label={t('editor.image.height')} min={1} max={800} value={heightPct} onChange={(v) => set({ sy: (v * natural) / (100 * layer.w) }, `h:${layer.id}`)} />
          </div>
        ) : (
          <Slider label={t('editor.image.scale')} icon="expand" min={1} max={800} value={widthPct} onChange={(v) => set({ w: (v / 100) * natural }, `w:${layer.id}`)} />
        )}
      </section>
      <CommonProps layer={layer} patch={patch} actions={actions} />
    </>
  )
}
