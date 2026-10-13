import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import Button from '../../components/Button.jsx'
import { Field, FieldError } from '../../components/Field.jsx'
import Modal from '../../components/Modal.jsx'

const MAX_TAGS = 5

const parseTags = (text) => text.split(',').map((x) => x.trim()).filter(Boolean).slice(0, MAX_TAGS)

export default function PublishModal({ initial, fields, sources, itemId, onDone, onClose }) {
  const { t } = useTranslation()
  const picking = Array.isArray(sources)
  const editing = Boolean(itemId)
  const first = picking ? sources[0] : null
  const [sourceId, setSourceId] = useState(first?.id || '')
  const [touched, setTouched] = useState(false)
  const [title, setTitle] = useState(initial?.title ?? first?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? first?.description ?? '')
  const [tags, setTags] = useState((initial?.tags || []).join(', '))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const source = picking ? sources.find((s) => s.id === sourceId) : null
  const payloadFields = picking ? source?.fields : fields
  const ready = title.trim() && (editing || payloadFields?.length)

  const pickSource = (id) => {
    setSourceId(id)
    if (touched) return
    const next = sources.find((s) => s.id === id)
    setTitle(next?.name || '')
    setDescription(next?.description || '')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true); setErr('')
    const listing = { title, description, tags: parseTags(tags) }
    try {
      const saved = editing
        ? await api.patch(`/market/items/${itemId}`, listing)
        : await api.post('/market/items', {
          kind: 'template',
          ...listing,
          payload: { fields: payloadFields.map(({ key, label, type, hint, send }) => ({ key, label, type, hint, send })) },
        })
      onDone(saved)
    } catch (ex) { setErr(ex.message); setBusy(false) }
  }

  if (picking && !sources.length) {
    return (
      <Modal title={t('market.publishTitle')} onClose={onClose}>
        <p className="mk-note">{t('market.noSources')}</p>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal title={editing ? t('market.editTitle') : t('market.publishTitle')} onClose={onClose}>
      <form onSubmit={submit}>
        {!editing && <p className="mk-note">{t('market.publishHelp')}</p>}
        {editing && <p className="mk-note">{t('market.codeNote', { code: initial.code })}</p>}
        {picking && (
          <Field label={t('market.sourceLabel')} hint={t('market.fieldCount', { count: payloadFields?.length || 0 })}>
            <select value={sourceId} onChange={(e) => pickSource(e.target.value)}>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label={t('market.titleLabel')}>
          <input autoFocus={!picking} value={title} maxLength={80} onChange={(e) => { setTouched(true); setTitle(e.target.value) }} />
        </Field>
        <Field label={t('market.descLabel')}>
          <input value={description} maxLength={300} onChange={(e) => { setTouched(true); setDescription(e.target.value) }} placeholder={t('market.descPlaceholder')} />
        </Field>
        <Field label={t('market.tagsLabel')} hint={t('market.tagsHint', { max: MAX_TAGS })}>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t('market.tagsPlaceholder')} />
        </Field>
        <FieldError>{err}</FieldError>
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" icon={editing ? 'check' : 'share'} loading={busy} disabled={!ready}>
            {editing ? t('market.save') : t('market.publish')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
