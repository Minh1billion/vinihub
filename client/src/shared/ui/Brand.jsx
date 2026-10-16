export default function Brand({ className = '' }) {
  return (
    <div className={('brand ' + className).trim()}>
      <img className="brand-logo" src="/logo.png" alt="" />
      <span>Vini<b>Hub</b></span>
    </div>
  )
}
