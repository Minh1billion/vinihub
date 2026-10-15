import Icon from '../../components/Icon.jsx'

export default function Slider({ label, value, min, max, step = 1, onChange, icon }) {
  return (
    <label className="field ed-slider">
      <span className="field-label">
        {icon && <span className="ed-sicon"><Icon name={icon} size={14} /></span>}
        <span className="ed-slabel">{label}</span>
        <span className="field-count num">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}
