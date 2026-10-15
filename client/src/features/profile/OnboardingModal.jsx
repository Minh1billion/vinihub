import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import { useApp } from '../../app/AppContext.jsx'
import Button from '../../components/Button.jsx'
import { FieldError } from '../../components/Field.jsx'
import Modal from '../../components/Modal.jsx'
import AvatarPicker from './AvatarPicker.jsx'
import NameField from './NameField.jsx'

export default function OnboardingModal() {
  const { t } = useTranslation()
  const { user, updateUser } = useApp()
  const saved = useRef(null)
  const [name, setName] = useState(user.name)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const onClose = () => {
    if (saved.current) {
      updateUser(saved.current)
      return
    }
    updateUser({ onboarded: true })
    api.patch('/me/profile', { complete_onboarding: true }).then(updateUser).catch(() => null)
  }

  const start = async (close) => {
    if (!name.trim()) { setErr(t('profile.nameRequired')); return }
    setBusy(true)
    setErr('')
    try {
      saved.current = await api.patch('/me/profile', { display_name: name, complete_onboarding: true })
      close()
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <Modal title={t('profile.onboard.title')} onClose={onClose} className="ob">
      {(close) => (
        <div className="ob-body">
          <p>{t('profile.onboard.text')}</p>
          <AvatarPicker user={user} onChange={updateUser} size={96} center />
          <div className="ob-name"><NameField value={name} onChange={setName} onError={setErr} /></div>
          <FieldError>{err}</FieldError>
          <div className="ob-actions">
            <Button block loading={busy} onClick={() => start(close)}>{t('profile.onboard.cta')}</Button>
            <Button variant="link" size="sm" disabled={busy} onClick={close}>{t('profile.onboard.skip')}</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
