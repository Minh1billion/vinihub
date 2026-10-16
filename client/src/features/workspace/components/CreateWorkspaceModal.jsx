import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import { Field, FieldError } from '@/shared/ui/Field.jsx'
import Modal from '@/shared/ui/Modal.jsx'

export default function CreateWorkspaceModal({ onClose }) {
  const { t } = useTranslation()
  const { reload, setWid } = useApp()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const ws = await api.post('/workspaces', { name })
      await reload()
      setWid(ws.id)
      onClose()
    } catch (x) { setErr(x.message); setBusy(false) }
  }

  return (
    <Modal title={t('workspace.create')} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label={t('workspace.nameLabel')}>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder={t('workspace.namePlaceholder')} />
        </Field>
        <FieldError>{err}</FieldError>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={busy} disabled={!name.trim()}>{t('workspace.create')}</Button>
        </div>
      </form>
    </Modal>
  )
}
