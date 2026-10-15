import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import Icon from '../../../components/Icon.jsx'
import Segmented from '../../../components/Segmented.jsx'
import Slider from '../Slider.jsx'
import { fitImage, flipImage, skewOf, sourceOf, turnImage } from '../layers.js'
import CommonProps from './CommonProps.jsx'

const FITS = [
  ['contain', 'fitContain'],
  ['cover', 'fitCover'],
  ['fill', 'fitFill'],
]

export default function ImageProps({ layer, patch, actions, canvas, onCrop }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)

  const natural = sourceOf(layer).width
  const stretch = Boolean(layer.stretch)
  const widthPct = Math.round((layer.w / natural) * 100)
  const heightPct = Math.round((layer.w / natural) * skewOf(layer) * 100)
  const reset = () => set({ rotation: 0, w: natural, sy: 1, stretch: false })
  const tool = ({ id, icon, label, ...rest }) => (
    <Button key={id} variant="ghost" size="sm" block icon={icon} data-tip={label} aria-label={label} {...rest} />
  )
  const resize = (v) => {
    const w = (v / 100) * natural
    set({ w, sy: (skewOf(layer) * layer.w) / w }, `w:${layer.id}`)
  }

  return (
    <>
      <section className="ed-sec">
        {stretch ? (
          <div className="ed-grid2">
            <Slider label={t('editor.image.width')} min={1} max={800} value={widthPct} onChange={resize} />
            <Slider label={t('editor.image.height')} min={1} max={800} value={heightPct} onChange={(v) => set({ sy: (v * natural) / (100 * layer.w) }, `h:${layer.id}`)} />
          </div>
        ) : (
          <Slider label={t('editor.image.size')} icon="expand" min={1} max={800} value={widthPct} onChange={(v) => set({ w: (v / 100) * natural }, `w:${layer.id}`)} />
        )}
        <div className="ed-btnrow ed-btnrow--4">
          {tool({ id: 'crop', icon: 'crop', label: t('editor.tool.crop'), onClick: onCrop })}
          {tool({ id: 'rotate', icon: 'rotate', label: t('editor.crop.rotateRight'), onClick: () => set(turnImage(layer)) })}
          {tool({ id: 'flipH', icon: 'flip', label: t('editor.crop.flipH'), onClick: () => set(flipImage(layer, 'h')) })}
          {tool({ id: 'flipV', icon: 'flip', label: t('editor.crop.flipV'), className: 'ed-vert', onClick: () => set(flipImage(layer, 'v')) })}
        </div>
      </section>
      <section className="ed-sec">
        <h4 className="ed-sec-title">{t('editor.image.render')}</h4>
        <Segmented label={t('editor.image.render')} value={stretch ? 'stretch' : 'scale'}
          onChange={(v) => set(v === 'stretch' ? { stretch: true } : { stretch: false, sy: 1 })}
          options={[
            { value: 'scale', label: <Icon name="scale" size={16} />, tip: t('editor.image.mode.scale') },
            { value: 'stretch', label: <Icon name="stretchX" size={16} />, tip: t('editor.image.mode.stretch') },
          ]} />
        <div className="ed-btnrow ed-btnrow--4">
          {FITS.map(([mode, icon]) => tool({
            id: mode,
            icon,
            label: canvas ? t(`editor.image.fit.${mode}`) : `${t(`editor.image.fit.${mode}`)} · ${t('editor.image.needCanvas')}`,
            className: canvas ? '' : 'is-off',
            'aria-disabled': !canvas,
            onClick: canvas ? () => set(fitImage(layer, mode, canvas)) : undefined,
          }))}
          {tool({ id: 'reset', icon: 'refresh', label: t('editor.image.reset'), onClick: reset })}
        </div>
      </section>
      <CommonProps layer={layer} patch={patch} actions={actions} />
    </>
  )
}
