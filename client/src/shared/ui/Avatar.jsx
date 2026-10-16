export default function Avatar({ src, size, className = '' }) {
  const style = size ? { width: size, height: size } : undefined
  const cls = 'avatar' + (className ? ' ' + className : '')
  return src
    ? <img className={cls} src={src} alt="" referrerPolicy="no-referrer" draggable="false" style={style} />
    : <span className={cls + ' avatar-dot'} style={style} />
}
