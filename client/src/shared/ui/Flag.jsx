const STRIPE = 20 / 13
const STARS = Array.from({ length: 12 }, (_, i) => ({ x: 2 + (i % 4) * 2.7, y: 1.8 + Math.floor(i / 4) * 2.7 }))

const FLAGS = {
  vi: (
    <>
      <rect width="30" height="20" fill="#da251d" />
      <path fill="#ffff00" d="M15 4l1.8 5.5h5.8l-4.7 3.4 1.8 5.5-4.7-3.4-4.7 3.4 1.8-5.5-4.7-3.4h5.8z" />
    </>
  ),
  en: (
    <>
      <rect width="30" height="20" fill="#b22234" />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} y={(2 * i + 1) * STRIPE} width="30" height={STRIPE} fill="#fff" />)}
      <rect width="12.5" height={STRIPE * 7} fill="#3c3b6e" />
      {STARS.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r="0.55" fill="#fff" />)}
    </>
  ),
}

export default function Flag({ code }) {
  return (
    <svg className="flag" width="22" height="15" viewBox="0 0 30 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      {FLAGS[code]}
    </svg>
  )
}
