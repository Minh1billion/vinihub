import Icon from './Icon.jsx'

export default function Button({
  variant = 'primary', size, icon, loading = false, block = false, disabled, href, className = '', children, ...rest
}) {
  const cls = ['btn', `btn-${variant}`, size && `btn-${size}`, block && 'btn-block', loading && 'is-loading', className]
    .filter(Boolean).join(' ')
  const content = <>{icon && !loading && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}{children}</>
  if (href) return <a className={cls} href={href} {...rest}>{content}</a>
  return <button type="button" className={cls} disabled={disabled || loading} {...rest}>{content}</button>
}
