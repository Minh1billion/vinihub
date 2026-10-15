import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import Slider from '../Slider.jsx'
import CommonProps from './CommonProps.jsx'

export default function ImageProps({ layer, patch }) {
  const { t } = useTranslation()
  const set = (change, key) => patch(layer.id, change, key)

  const natural = layer.bitmap.width
  const reset = () => set({ rotation: 0, w: natural })

  return (
    <>
      <section className="ed-sec">
        <Slider label={t('editor.image.size')} icon="expand" min={1} max={800} value={Math.round((layer.w / natural) * 100)} onChange={(v) => set({ w: (v / 100) * natural }, `w:${layer.id}`)} />
        <div className="ed-btnrow">
          <Button variant="ghost" size="sm" block icon="flip" onClick={() => set({ flipH: !layer.flipH })}>{t('editor.crop.flipH')}</Button>
          <Button variant="ghost" size="sm" block icon="flip" className="ed-vert" onClick={() => set({ flipV: !layer.flipV })}>{t('editor.crop.flipV')}</Button>
        </div>
        <Button variant="soft" size="sm" block icon="refresh" onClick={reset}>{t('editor.image.reset')}</Button>
      </section>
      <CommonProps layer={layer} patch={patch} />
    </>
  )
}
