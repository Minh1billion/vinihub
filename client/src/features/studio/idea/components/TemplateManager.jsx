import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../../../api/client.js'
import { useApp } from '../../../../app/AppContext.jsx'
import { useDialog } from '../../../../app/DialogContext.jsx'
import Button from '../../../../components/Button.jsx'
import Modal from '../../../../components/Modal.jsx'
import PublishModal from '../../../market/PublishModal.jsx'
import PresetModal from './PresetModal.jsx'
import TemplateEditor, { blankField } from './TemplateEditor.jsx'

const toDraft = (x) => ({
  name: x.name,
  description: x.description,
  fields: x.fields.map(({ key, label, type, hint, send }) => ({ key, label, type, hint, send })),
})

export default function TemplateManager({ templates, onUse, onChanged, onClose }) {
  const { t } = useTranslation()
  const { wid, user, workspaces } = useApp()
  const dialog = useDialog()
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [presetsOpen, setPresetsOpen] = useState(false)
  const [sharing, setSharing] = useState(null)
  const role = workspaces.find((w) => w.id === wid)?.role
  const canEdit = (x) => x.user_id === user.id || role === 'owner'

  const startNew = () => { setErr(''); setEditing({ draft: { name: '', description: '', fields: [blankField()] } }) }
  const startCopy = (x) => {
    const draft = toDraft(x)
    setErr('')
    setEditing({ draft: { ...draft, fields: draft.fields.map((f) => ({ ...f, key: undefined })) } })
  }
  const startEdit = (x) => { setErr(''); setEditing({ id: x.id, draft: toDraft(x) }) }

  const save = async (body) => {
    setSaving(true); setErr('')
    try {
      const path = `/workspaces/${wid}/templates`
      const saved = editing.id ? await api.patch(`${path}/${editing.id}`, body) : await api.post(path, body)
      await onChanged()
      if (editing.id) setEditing(null)
      else onUse(saved.id)
    } catch (e) { setErr(e.message) }
    setSaving(false)
  }

  const remove = async (x) => {
    const ok = await dialog.confirm({ tone: 'warning', message: t('template.confirmDelete', { name: x.name }), confirmLabel: t('common.delete'), danger: true })
    if (!ok) return
    try {
      await api.del(`/workspaces/${wid}/templates/${x.id}`)
      await onChanged()
    } catch (e) { dialog.error(e.message) }
  }

  return (
    <Modal className="tm-modal" title={editing ? (editing.id ? t('template.editTitle') : t('template.newTitle')) : t('template.manageTitle')} onClose={onClose}>
      {editing ? (
        <TemplateEditor initial={editing.draft} saving={saving} error={err} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <>
          <div className="tm-list">
            {(templates || []).map((x) => (
              <div className="tm-item" key={x.id}>
                <div className="tm-info">
                  <strong>{x.name}</strong>
                  {x.description && <small>{x.description}</small>}
                  <span className="tm-meta">{t('template.fieldCount', { count: x.fields.length })}</span>
                </div>
                <div className="tm-actions">
                  <Button variant="ghost" size="sm" onClick={() => onUse(x.id)}>{t('template.use')}</Button>
                  <Button variant="ghost" size="sm" onClick={() => startCopy(x)}>{t('template.duplicate')}</Button>
                  <Button variant="ghost" size="sm" icon="share" onClick={() => setSharing(x)}>{t('market.share')}</Button>
                  {canEdit(x) && <Button variant="ghost" size="sm" onClick={() => startEdit(x)}>{t('template.edit')}</Button>}
                  {canEdit(x) && <Button variant="ghost" size="sm" onClick={() => remove(x)}>{t('common.delete')}</Button>}
                </div>
              </div>
            ))}
          </div>
          {templates && !templates.length && <p className="tm-empty">{t('template.empty')}</p>}
          <div className="modal-actions">
            <Button variant="ghost" icon="library" onClick={() => setPresetsOpen(true)}>{t('template.presets')}</Button>
            <Button icon="plus" onClick={startNew}>{t('template.new')}</Button>
          </div>
        </>
      )}
      {sharing && (
        <PublishModal
          initial={{ title: sharing.name, description: sharing.description, tags: [] }}
          fields={sharing.fields}
          onDone={() => { setSharing(null); dialog.info(t('market.published')) }}
          onClose={() => setSharing(null)}
        />
      )}
      {presetsOpen && <PresetModal onAdded={onChanged} onClose={() => setPresetsOpen(false)} />}
    </Modal>
  )
}
