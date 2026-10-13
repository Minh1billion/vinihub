export function Field({ label, hint, group = false, children }) {
  const Tag = group ? 'div' : 'label'
  return (
    <Tag className="field" role={group ? 'group' : undefined}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </Tag>
  )
}

export const FieldError = ({ children }) => (children ? <p className="err" role="alert">{children}</p> : null)
