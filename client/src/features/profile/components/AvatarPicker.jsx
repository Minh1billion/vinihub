import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import Avatar from '@/shared/ui/Avatar.jsx'
import Button from '@/shared/ui/Button.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX = 5 * 1024 * 1024

export default function AvatarPicker({ user, onChange, size = 88, center = false }) {
  const { t } = useTranslation()
  const input = useRef(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const run = async (kind, job) => {
    setBusy(kind)
    setErr('')
    try {
      onChange(await job())
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy('')
    }
  }

  const pick = (file) => {
    if (!file) return
    if (!TYPES.includes(file.type)) { setErr(t('profile.fileType')); return }
    if (file.size > MAX) { setErr(t('profile.fileSize')); return }
    const body = new FormData()
    body.append('file', file)
    run('upload', () => api.post('/me/profile/avatar', body))
  }

  return (
    <div className={'pf-photo' + (center ? ' is-center' : '')}>
      <Avatar src={user.avatar_url} size={size} />
      <div className="pf-photo-actions">
        <div className="pf-photo-btns">
          <Button variant="ghost" size="sm" icon="upload" loading={busy === 'upload'} disabled={Boolean(busy)} onClick={() => input.current.click()}>{t('profile.upload')}</Button>
          {user.avatar_source === 'upload' && (
            <Button variant="link" size="sm" loading={busy === 'reset'} disabled={Boolean(busy)} onClick={() => run('reset', () => api.del('/me/profile/avatar'))}>
              {user.oauth_avatar_url ? t('profile.useGoogle') : t('profile.removePhoto')}
            </Button>
          )}
        </div>
        <small>{t('profile.photoHint')}</small>
        <FieldError>{err}</FieldError>
      </div>
      <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = '' }} />
    </div>
  )
}
