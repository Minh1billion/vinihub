export default function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className={'toggle' + (checked ? ' on' : '')}
      onClick={() => onChange(!checked)}>
      <span className="toggle-track"><i /></span>
      <span>{label}</span>
    </button>
  )
}
