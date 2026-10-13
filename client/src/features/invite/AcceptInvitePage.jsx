import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/client.js'
import { useApp } from '../../app/AppContext.jsx'
import Brand from '../../components/Brand.jsx'
import Button from '../../components/Button.jsx'
import { FieldError } from '../../components/Field.jsx'

export default function AcceptInvitePage() {
  const { t } = useTranslation()
  const { token } = useParams()
  const navigate = useNavigate()
  const { user, reload, setWid } = useApp()
  const [invite, setInvite] = useState(null)
  const [err, setErr] = useState('')
  const [dead, setDead] = useState(false)
  const [wrongAccount, setWrongAccount] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/invites/${token}`).then(setInvite).catch((x) => { setErr(x.message); setDead(true) })
  }, [token])

  const accept = async () => {
    setBusy(true); setErr('')
    try {
      const ws = await api.post(`/invites/${token}/accept`)
      await reload()
      setWid(ws.id)
      navigate('/studio', { replace: true })
    } catch (x) {
      setErr(x.message)
      setWrongAccount(x.status === 403)
      setBusy(false)
    }
  }

  const switchAccount = async () => {
    await api.post('/auth/logout')
    window.location.reload()
  }

  return (
    <div className="invite-page">
      <section className="invite-card">
        <Brand />
        {dead ? (
          <>
            <h2>{t('invite.deadTitle')}</h2>
            <FieldError>{err}</FieldError>
            <p>{t('invite.deadHint')}</p>
            <Button block onClick={() => navigate('/studio', { replace: true })}>{t('invite.home')}</Button>
          </>
        ) : invite ? (
          <>
            <h2>{t('invite.joinTitle', { workspace: invite.workspace })}</h2>
            <p>{t('invite.joinBody', { inviter: invite.inviter, email: user.email })}</p>
            <FieldError>{err}</FieldError>
            <div className="invite-actions">
              {wrongAccount
                ? <Button block onClick={switchAccount}>{t('invite.switchAccount')}</Button>
                : <Button block loading={busy} onClick={accept}>{t('invite.accept')}</Button>}
              <Button variant="ghost" block onClick={() => navigate('/studio', { replace: true })}>{t('invite.later')}</Button>
            </div>
          </>
        ) : (
          <p>{t('invite.checking')}</p>
        )}
      </section>
    </div>
  )
}
