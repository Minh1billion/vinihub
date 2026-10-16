export default function EmptyState({ title, text, children }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  )
}

export function SamplePrompts({ items, onPick }) {
  return (
    <div className="samples">
      {items.map((s) => <button key={s} type="button" className="chip" onClick={() => onPick(s)}>{s}</button>)}
    </div>
  )
}
