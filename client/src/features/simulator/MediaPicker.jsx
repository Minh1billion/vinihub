import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FieldError } from '../../components/Field.jsx'
import Icon from '../../components/Icon.jsx'

let seq = 0

const probe = (url, kind) => new Promise((resolve) => {
  if (kind === 'video') {
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => resolve({ w: v.videoWidth, h: v.videoHeight })
    v.onerror = () => resolve({ w: 0, h: 0 })
    v.src = url
    return
  }
  const img = new Image()
  img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
  img.onerror = () => resolve({ w: 0, h: 0 })
  img.src = url
})

export default function MediaPicker({ value, setValue }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const latest = useRef(value)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')

  latest.current = value
  useEffect(() => () => latest.current.forEach((m) => URL.revokeObjectURL(m.url)), [])

  const add = async (files) => {
    const list = Array.from(files || []).filter((f) => /^(image|video)\//.test(f.type))
    if (!list.length) { setErr(t('sim.pickMedia')); return }
    setErr('')
    const items = await Promise.all(list.map(async (f) => {
      const url = URL.createObjectURL(f)
      const kind = f.type.startsWith('video/') ? 'video' : 'image'
      return { id: `m${++seq}`, url, kind, name: f.name, ...(await probe(url, kind)) }
    }))
    setValue((cur) => [...cur, ...items])
  }

  const remove = (item) => {
    URL.revokeObjectURL(item.url)
    setValue((cur) => cur.filter((m) => m.id !== item.id))
  }

  const move = (index, step) => setValue((cur) => {
    const next = cur.slice()
    const [item] = next.splice(index, 1)
    next.splice(index + step, 0, item)
    return next
  })

  return (
    <div className="field compact">
      <span className="field-label">{t('sim.media')}<span className="field-count num">{value.length}</span></span>
      {value.length > 0 && (
        <div className="thumbs sim-thumbs">
          {value.map((m, i) => (
            <div key={m.id} className="thumb">
              {m.kind === 'video' ? <video src={m.url} muted preload="metadata" /> : <img src={m.url} alt="" />}
              <button type="button" className="thumb-x" aria-label={t('sim.removeMedia', { n: i + 1 })} onClick={() => remove(m)}><Icon name="close" size={12} /></button>
              {value.length > 1 && (
                <span className="thumb-move">
                  <button type="button" disabled={i === 0} aria-label={t('sim.moveLeft', { n: i + 1 })} onClick={() => move(i, -1)}><Icon name="chevron" size={12} /></button>
                  <button type="button" disabled={i === value.length - 1} aria-label={t('sim.moveRight', { n: i + 1 })} onClick={() => move(i, 1)}><Icon name="chevron" size={12} /></button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <button type="button" className={'dropzone' + (over ? ' over' : '')} onClick={() => input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); add(e.dataTransfer.files) }}>
        <Icon name="upload" size={22} />
        <strong>{t('sim.addMediaCta')}</strong>
        <small>{t('sim.mediaHint')}</small>
      </button>
      <input ref={input} type="file" accept="image/*,video/*" multiple hidden
        onChange={(e) => { add(e.target.files); e.target.value = '' }} />
      <FieldError>{err}</FieldError>
    </div>
  )
}
