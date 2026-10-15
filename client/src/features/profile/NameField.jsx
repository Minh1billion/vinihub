import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import { Field } from '../../components/Field.jsx'
import Icon from '../../components/Icon.jsx'

export default function NameField({ value, onChange, onError }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)

  const roll = async () => {
    setBusy(true)
    try {
      onChange((await api.get('/me/profile/random-name')).name)
    } catch (e) {
      onError?.(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Field label={t('profile.name')} group>
      <div className="pf-name">
        <input value={value} maxLength={40} aria-label={t('profile.name')} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="icon-btn" disabled={busy} onClick={roll} aria-label={t('profile.randomName')} data-tip={t('profile.randomName')}>
          <Icon name="refresh" size={18} />
        </button>
      </div>
    </Field>
  )
}
