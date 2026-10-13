import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import Button from '../../components/Button.jsx'
import Checkbox from '../../components/Checkbox.jsx'
import { Field, FieldError } from '../../components/Field.jsx'
import Modal from '../../components/Modal.jsx'

export default function AddKeyModal({ provider, onSaved, onClose }) {
  const { t } = useTranslation()
  const first = provider.keys.length === 0
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [activate, setActivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      onSaved(await api.post(`/providers/${provider.slug}/keys`, { label, api_key: apiKey, activate }))
      onClose()
    } catch (x) { setErr(x.message); setBusy(false) }
  }

  return (
    <Modal title={t('providers.addTitle', { name: provider.name })} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label={t('providers.keyLabel')} hint={t('providers.keyLabelHint')}>
          <input autoFocus value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={t('providers.keyLabelPlaceholder')} />
        </Field>
        <Field label={t('providers.keyValue')} hint={t('providers.keyValueHint')}>
          <input type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={(e) => setApiKey(e.target.value)} maxLength={500} />
        </Field>
        {!first && <Checkbox checked={activate} onChange={setActivate}>{t('providers.activateNow')}</Checkbox>}
        <FieldError>{err}</FieldError>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={busy} disabled={!apiKey.trim()}>{t('providers.addKey')}</Button>
        </div>
      </form>
    </Modal>
  )
}
