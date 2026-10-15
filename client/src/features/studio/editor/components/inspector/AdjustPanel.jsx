import { useTranslation } from 'react-i18next'
import Button from '../../../../../components/Button.jsx'
import Slider from '../Slider.jsx'
import { initialAdjust } from '../../utils/pixels.js'

const ROWS = [
  ['brightness', -100, 100, 'sun'],
  ['contrast', -100, 100, 'contrast'],
  ['saturation', -100, 100, 'drop'],
  ['temperature', -100, 100, 'thermo'],
  ['blur', 0, 100, 'blur'],
  ['vignette', 0, 100, 'vignette'],
]

export default function AdjustPanel({ layer, patch }) {
  const { t } = useTranslation()
  if (!layer) return <small>{t('editor.needImage')}</small>
  const set = (key) => (value) => patch(layer.id, { adjust: { ...layer.adjust, [key]: value } }, `adjust:${layer.id}:${key}`)
  const changed = ROWS.some(([key]) => layer.adjust[key] !== 0)
  return (
    <section className="ed-sec">
      <h4 className="ed-sec-title">{t('editor.tool.adjust')}</h4>
      {ROWS.map(([key, min, max, icon]) => (
        <Slider key={key} label={t(`editor.adjust.${key}`)} min={min} max={max} value={layer.adjust[key]} onChange={set(key)} icon={icon} />
      ))}
      <Button variant="soft" size="sm" block icon="refresh" disabled={!changed} onClick={() => patch(layer.id, { adjust: { ...initialAdjust } })}>
        {t('editor.adjust.reset')}
      </Button>
    </section>
  )
}
