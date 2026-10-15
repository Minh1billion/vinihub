import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../../../components/Button.jsx'
import { Field, FieldError } from '../../../../components/Field.jsx'
import Icon from '../../../../components/Icon.jsx'
import Segmented from '../../../../components/Segmented.jsx'

const MAX_FIELDS = 12

export const blankField = () => ({ label: '', type: 'string', hint: '', send: null })

export default function TemplateEditor({ initial, saving, error, onSave, onCancel }) {
  const { t } = useTranslation()
  const uid = useRef(0)
  const withUid = (f) => ({ ...f, uid: ++uid.current })
  const [name, setName] = useState(initial.name)
  const [description, setDescription] = useState(initial.description)
  const [fields, setFields] = useState(() => initial.fields.map(withUid))

  const patch = (id, changes) => setFields((list) => list.map((f) => (f.uid === id ? { ...f, ...changes } : f)))
  const remove = (id) => setFields((list) => list.filter((f) => f.uid !== id))
  const move = (id, step) => setFields((list) => {
    const i = list.findIndex((f) => f.uid === id)
    const j = i + step
    if (j < 0 || j >= list.length) return list
    const next = [...list]
    ;[next[i], next[j]] = [next[j], next[i]]
    return next
  })

  const valid = name.trim() && fields.length > 0 && fields.every((f) => f.label.trim())
  const typeOptions = [
    { value: 'string', label: t('template.typeString') },
    { value: 'list', label: t('template.typeList') },
  ]
  const sendOptions = [
    { value: '', label: t('template.sendNone') },
    { value: 'image', label: t('template.sendImage') },
    { value: 'video', label: t('template.sendVideo') },
  ]

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSave({
      name,
      description,
      fields: fields.map(({ key, label, type, hint, send }) => ({ key, label, type, hint, send })),
    })
  }

  return (
    <form onSubmit={submit}>
      <div className="tm-head">
        <Field label={t('template.nameLabel')}>
          <input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t('template.namePlaceholder')} />
        </Field>
        <Field label={t('template.descLabel')}>
          <input value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder={t('template.descPlaceholder')} />
        </Field>
      </div>

      <div className="tm-fields-head">
        <strong>{t('template.fieldsTitle')}</strong>
        <small>{t('template.fieldsHelp')}</small>
        <small><b>{t('template.fieldType')}:</b> {t('template.typeHint')}</small>
        <small><b>{t('template.fieldSend')}:</b> {t('template.sendHint')}</small>
      </div>
      <div className="tm-fields">
        {fields.map((f, i) => (
          <div className="tm-field" key={f.uid}>
            <div className="tm-field-main">
              <div className="tm-field-row">
                <input value={f.label} maxLength={60} onChange={(e) => patch(f.uid, { label: e.target.value })}
                  placeholder={t('template.fieldLabelPlaceholder')} aria-label={t('template.fieldLabel')} />
                <input value={f.hint} maxLength={300} onChange={(e) => patch(f.uid, { hint: e.target.value })}
                  placeholder={t('template.fieldHintPlaceholder')} aria-label={t('template.fieldHint')} />
              </div>
              <div className="tm-field-opts">
                <div className="tm-opt" role="group" aria-label={t('template.fieldType')}>
                  <span className="tm-opt-label">{t('template.fieldType')}</span>
                  <Segmented label={t('template.fieldType')} options={typeOptions} value={f.type} onChange={(v) => patch(f.uid, { type: v })} />
                </div>
                <div className="tm-opt" role="group" aria-label={t('template.fieldSend')}>
                  <span className="tm-opt-label">{t('template.fieldSend')}</span>
                  <Segmented label={t('template.fieldSend')} options={sendOptions} value={f.send || ''} onChange={(v) => patch(f.uid, { send: v || null })} />
                </div>
              </div>
            </div>
            <div className="tm-field-tools">
              <button type="button" className="icon-btn tm-up" disabled={i === 0} onClick={() => move(f.uid, -1)} aria-label={t('template.moveUp')}><Icon name="chevron" size={16} /></button>
              <button type="button" className="icon-btn" disabled={i === fields.length - 1} onClick={() => move(f.uid, 1)} aria-label={t('template.moveDown')}><Icon name="chevron" size={16} /></button>
              <button type="button" className="icon-btn" disabled={fields.length === 1} onClick={() => remove(f.uid)} aria-label={t('template.removeField')}><Icon name="close" size={16} /></button>
            </div>
          </div>
        ))}
      </div>
      <Button variant="ghost" size="sm" icon="plus" disabled={fields.length >= MAX_FIELDS}
        onClick={() => setFields((list) => [...list, withUid(blankField())])}>
        {t('template.addField')}
      </Button>

      <FieldError>{error}</FieldError>
      <div className="modal-actions">
        <Button variant="ghost" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" loading={saving} disabled={!valid}>{t('template.save')}</Button>
      </div>
    </form>
  )
}
