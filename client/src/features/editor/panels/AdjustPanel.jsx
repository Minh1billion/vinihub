import { useTranslation } from 'react-i18next'
import Button from '../../../components/Button.jsx'
import Slider from '../Slider.jsx'
import { initialEdit } from '../edit.js'

const ROWS = [
  ['brightness', -100, 100],
  ['contrast', -100, 100],
  ['saturation', -100, 100],
  ['temperature', -100, 100],
  ['blur', 0, 100],
  ['vignette', 0, 100],
]

export default function AdjustPanel({ edit, commit }) {
  const { t } = useTranslation()
  const set = (key) => (value) => commit((e) => ({ ...e, adjust: { ...e.adjust, [key]: value } }), `adjust:${key}`)
  const changed = ROWS.some(([key]) => edit.adjust[key] !== 0)
  return (
    <>
      {ROWS.map(([key, min, max]) => (
        <Slider key={key} label={t(`editor.adjust.${key}`)} min={min} max={max} value={edit.adjust[key]} onChange={set(key)} />
      ))}
      <Button variant="ghost" size="sm" disabled={!changed} onClick={() => commit((e) => ({ ...e, adjust: initialEdit.adjust }))}>
        {t('editor.adjust.reset')}
      </Button>
    </>
  )
}
