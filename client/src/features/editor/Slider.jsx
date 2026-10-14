export default function Slider({ label, value, min, max, step = 1, onChange }) {
  return (
    <label className="field">
      <span className="field-label">{label}<span className="field-count num">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}
