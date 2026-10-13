import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { uploadFile } from '../api/client.js'
import { useApp } from '../app/AppContext.jsx'
import Button from './Button.jsx'
import { FieldError } from './Field.jsx'
import Icon from './Icon.jsx'

export default function Dropzone({ accept, label, hint, value, onChange, compact = false, cta }) {
  const { t } = useTranslation()
  const { wid } = useApp()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)
  const [err, setErr] = useState('')
  const family = accept.split('/')[0]

  const handle = async (file) => {
    if (!file) return
    if (!file.type.startsWith(family + '/')) {
      setErr(family === 'image' ? t('dropzone.pickImage') : t('dropzone.pickVideo'))
      return
    }
    setBusy(true); setErr('')
    try { onChange(await uploadFile(wid, file)) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  return (
    <div className={'field' + (compact ? ' compact' : '')}>
      {label && <span className="field-label">{label}</span>}
      {value ? (
        <div className="picked">
          {value.kind === 'video' ? <video src={value.url} muted /> : <img src={value.url} alt="" />}
          <Button variant="link" size="sm" onClick={() => onChange(null)}>{t('dropzone.clear')}</Button>
        </div>
      ) : (
        <>
          <button type="button" className={'dropzone' + (over ? ' over' : '')} disabled={busy}
            onClick={() => input.current.click()}
            onDragOver={(e) => { e.preventDefault(); setOver(true) }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); handle(e.dataTransfer.files[0]) }}>
            <Icon name="upload" size={22} />
            <strong>{busy ? t('dropzone.uploading') : cta || t('dropzone.cta')}</strong>
            {hint && <small>{hint}</small>}
          </button>
          <input ref={input} type="file" accept={accept} hidden
            onChange={(e) => { handle(e.target.files?.[0]); e.target.value = '' }} />
        </>
      )}
      <FieldError>{err}</FieldError>
    </div>
  )
}
