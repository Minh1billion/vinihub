import { useState } from 'react'
import { useTranslation } from 'react-i18next'

function Axis({ name, value, onChange, disabled }) {
  const [draft, setDraft] = useState(null)
  return (
    <label className="ed-pos">
      <span className="ed-pos-label">{name}</span>
      <input type="number" step={1} value={draft ?? String(value)} disabled={disabled} aria-label={name}
        onChange={(e) => {
          setDraft(e.target.value)
          const n = e.target.valueAsNumber
          if (Number.isFinite(n)) onChange(Math.round(n))
        }}
        onBlur={() => setDraft(null)} />
    </label>
  )
}

export default function PositionBar({ layer, canvas, patch }) {
  const { t } = useTranslation()
  const ox = canvas ? canvas.x : 0
  const oy = canvas ? canvas.y : 0
  return (
    <section className="ed-sec">
      <h4 className="ed-sec-title">{t('editor.group.position')}</h4>
      <div className="ed-pos-row">
        <Axis name="X" value={Math.round(layer.x - ox)} disabled={layer.locked} onChange={(v) => patch(layer.id, { x: v + ox }, `x:${layer.id}`)} />
        <Axis name="Y" value={Math.round(layer.y - oy)} disabled={layer.locked} onChange={(v) => patch(layer.id, { y: v + oy }, `y:${layer.id}`)} />
      </div>
    </section>
  )
}
