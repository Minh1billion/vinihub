import Icon from './Icon.jsx'

export default function Checkbox({ checked, onChange, children, className = '' }) {
  return (
    <label className={'check ' + className}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="check-box" aria-hidden="true"><Icon name="check" size={14} /></span>
      <span>{children}</span>
    </label>
  )
}
