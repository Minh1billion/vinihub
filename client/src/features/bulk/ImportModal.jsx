import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import Button from '../../components/Button.jsx'
import { Field, FieldError } from '../../components/Field.jsx'
import Modal from '../../components/Modal.jsx'

const MAX_BYTES = 2 * 1024 * 1024

export default function ImportModal({ title, help, endpoint, summarize, onDone, onClose }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')

  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setDone('')
    if (file.size > MAX_BYTES) { setErr(t('bulk.tooLarge')); return }
    setErr('')
    setText(await file.text())
    setName(file.name)
  }

  const edit = (value) => { setText(value); setName(''); setDone('') }

  const submit = async () => {
    let data
    try { data = JSON.parse(text) } catch { setErr(t('bulk.invalidJson')); return }
    if (!data || typeof data !== 'object' || Array.isArray(data)) { setErr(t('bulk.notObject')); return }
    setBusy(true); setErr(''); setDone('')
    try {
      const result = await api.post(endpoint, data)
      setDone(summarize(result))
      await onDone()
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }

  return (
    <Modal className="tm-modal" title={title} onClose={onClose}>
      <p className="bulk-help">{help}</p>
      <div className="bulk-bar">
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={pick} />
        <Button variant="soft" icon="upload" onClick={() => input.current?.click()}>{t('bulk.chooseFile')}</Button>
        {name && <span className="bulk-file">{name}</span>}
      </div>
      <Field label={t('bulk.pasteLabel')}>
        <textarea className="bulk-json" rows={10} spellCheck={false} value={text} placeholder={t('bulk.pastePlaceholder')}
          onChange={(e) => edit(e.target.value)} />
      </Field>
      <FieldError>{err}</FieldError>
      {done && <p className="bulk-done" role="status">{done}</p>}
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
        <Button loading={busy} disabled={!text.trim()} onClick={submit}>{t('bulk.import')}</Button>
      </div>
    </Modal>
  )
}
