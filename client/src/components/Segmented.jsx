export default function Segmented({ options, value, onChange, label }) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value}
          className={o.value === value ? 'on' : ''} title={o.title} data-tip={o.tip} aria-label={o.title || o.tip} lang={o.lang}
          onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}
