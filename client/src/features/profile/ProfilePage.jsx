import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '../../api/client.js'
import { useApp } from '../../app/AppContext.jsx'
import Button from '../../components/Button.jsx'
import { Field, FieldError } from '../../components/Field.jsx'
import Icon from '../../components/Icon.jsx'
import PageFrame from '../../layout/PageFrame.jsx'
import AvatarPicker from './AvatarPicker.jsx'
import NameField from './NameField.jsx'

const TABS = [[{ to: '/profile', labelKey: 'nav.profile', icon: 'user' }]]
const BIO_MAX = 280

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 30)

export default function ProfilePage() {
  const { t } = useTranslation()
  const { user, updateUser } = useApp()
  const timer = useRef(0)
  const [name, setName] = useState(user.name)
  const [handle, setHandle] = useState(user.handle || '')
  const [bio, setBio] = useState(user.bio || '')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => () => clearTimeout(timer.current), [])

  const dirty = name.trim() !== user.name || handle !== (user.handle || '') || bio.trim() !== (user.bio || '')

  const save = async () => {
    setBusy(true)
    setErr('')
    setSaved(false)
    try {
      const profile = await api.patch('/me/profile', { display_name: name, handle, bio })
      updateUser(profile)
      setName(profile.name)
      setHandle(profile.handle || '')
      setBio(profile.bio || '')
      setSaved(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setSaved(false), 2400)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageFrame title={t('profile.title')} ariaLabel={t('profile.title')} tabs={TABS}>
      <section className="page-main">
        <div className="pf scroll">
          <p className="pf-intro">{t('profile.intro')}</p>
          <section className="pf-card">
            <h2>{t('profile.photo')}</h2>
            <AvatarPicker user={user} onChange={updateUser} />
          </section>
          <section className="pf-card">
            <h2>{t('profile.details')}</h2>
            <NameField value={name} onChange={setName} onError={setErr} />
            <Field label={t('profile.handle')} hint={t('profile.handleHint')}>
              <span className="pf-at">
                <span aria-hidden="true">@</span>
                <input value={handle} maxLength={30} placeholder="your.name" onChange={(e) => setHandle(slug(e.target.value))} />
              </span>
            </Field>
            <Field label={<>{t('profile.bio')}<span className="field-count num">{bio.length}/{BIO_MAX}</span></>}>
              <textarea rows={3} value={bio} maxLength={BIO_MAX} placeholder={t('profile.bioPlaceholder')} onChange={(e) => setBio(e.target.value)} />
            </Field>
            <Field label={t('profile.email')} hint={t('profile.emailHint')}>
              <input value={user.email} disabled readOnly />
            </Field>
            <FieldError>{err}</FieldError>
            <div className="pf-foot">
              <Button icon="check" loading={busy} disabled={!dirty || !name.trim()} onClick={save}>{t('profile.save')}</Button>
              {saved && <span className="pf-saved" role="status"><Icon name="check" size={16} />{t('profile.saved')}</span>}
            </div>
          </section>
        </div>
      </section>
    </PageFrame>
  )
}
