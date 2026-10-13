import { useState } from 'react'
import { TOKEN } from './platforms.js'

const render = (text) => text.split(TOKEN).map((part, i) => (i % 2 ? <span key={i} className="sim-tok">{part}</span> : part))

export default function Caption({ text, fold, more, empty, lead, className = '' }) {
  const [open, setOpen] = useState(false)
  if (!text.trim()) return <p className={'sim-caption sim-ghost ' + className}>{empty}</p>
  const cut = !open && text.length > fold
  const shown = cut ? text.slice(0, fold).trimEnd() : text
  return (
    <p className={'sim-caption ' + className}>
      {lead}
      {render(shown)}
      {cut && <>… <button type="button" className="sim-more" onClick={() => setOpen(true)}>{more}</button></>}
    </p>
  )
}
