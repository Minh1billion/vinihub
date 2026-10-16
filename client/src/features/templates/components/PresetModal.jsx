import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'
import Modal from '@/shared/ui/Modal.jsx'

export default function PresetModal({ onAdded, onClose }) {
  const { t } = useTranslation()
  const { wid } = useApp()
  const [presets, setPresets] = useState(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const base = `/workspaces/${wid}/templates/presets`

  useEffect(() => { api.get(base).then(setPresets).catch((e) => { setErr(e.message); setPresets([]) }) }, [base])

  const add = async (p) => {
    setBusy(p.id); setErr('')
    try {
      await api.post(`${base}/${p.id}`)
      setPresets((list) => list.map((x) => (x.id === p.id ? { ...x, added: true } : x)))
      await onAdded()
    } catch (e) { setErr(e.message) }
    setBusy('')
  }

  return (
    <Modal className="tm-modal" title={t('template.presetsTitle')} onClose={onClose}>
      <p className="tm-empty">{t('template.presetsHelp')}</p>
      <div className="tm-list">
        {(presets || []).map((p) => (
          <div className="tm-item" key={p.id}>
            <div className="tm-info">
              <strong>{p.name}</strong>
              {p.description && <small>{p.description}</small>}
              <span className="tm-meta">{t('template.fieldCount', { count: p.field_count })}</span>
            </div>
            <div className="tm-actions">
              <Button variant={p.added ? 'ghost' : 'soft'} size="sm" icon={p.added ? 'check' : 'plus'} disabled={p.added}
                loading={busy === p.id} onClick={() => add(p)}>{p.added ? t('template.presetAdded') : t('template.presetAdd')}</Button>
            </div>
          </div>
        ))}
      </div>
      {presets && !presets.length && !err && <p className="tm-empty">{t('template.presetsEmpty')}</p>}
      <FieldError>{err}</FieldError>
      <div className="modal-actions">
        <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
      </div>
    </Modal>
  )
}
