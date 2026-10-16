import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import Brand from '@/shared/ui/Brand.jsx'
import Button from '@/shared/ui/Button.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import LanguageSwitcher from '@/shared/ui/LanguageSwitcher.jsx'

const POINT_ICONS = ['message', 'image', 'library']

const HUB_NODES = [
  { icon: 'idea', y: 18.75 },
  { icon: 'image', y: 50 },
  { icon: 'video', y: 81.25 },
]

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}

function Hub() {
  return (
    <div className="hub" aria-hidden="true">
      <svg className="hub-lines" viewBox="0 0 420 160" fill="none" preserveAspectRatio="none">
        {[30, 80, 130].map((y) => (
          <path key={y} pathLength="1" d={`M98 80 C200 80 220 ${y} 316 ${y}`} />
        ))}
      </svg>
      <div className="hub-core"><img src="/logo.png" alt="" /></div>
      {HUB_NODES.map((n, i) => (
        <div key={n.icon} className="hub-node" style={{ '--y': `${n.y}%`, '--i': i }}>
          <Icon name={n.icon} size={22} />
        </div>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
  const token = window.location.pathname.match(/^\/invite\/([^/]+)/)?.[1]
  const [invite, setInvite] = useState(null)
  const [inviteErr, setInviteErr] = useState('')

  useEffect(() => {
    if (token) api.get(`/invites/${token}`).then(setInvite).catch((x) => setInviteErr(x.message))
  }, [token])

  const next = token ? `?next=${encodeURIComponent('/invite/' + token)}` : ''

  return (
    <div className="login">
      <LanguageSwitcher />
      <section className="login-intro">
        <Brand className="big" />
        <h1>{t('login.heading')}</h1>
        <p>{t('login.sub')}</p>
        <ul>
          {t('login.points', { returnObjects: true }).map((p, i) => (
            <li key={p}><span className="login-ico"><Icon name={POINT_ICONS[i] || 'check'} size={18} /></span>{p}</li>
          ))}
        </ul>
        <Hub />
      </section>
      <div className="login-side">
        <section className="login-card">
          <h2>{invite ? t('login.inviteTitle') : t('login.startTitle')}</h2>
          {invite && (
            <div className="login-invite">
              <Icon name="users" size={20} />
              <p>{t('login.inviteBody', { inviter: invite.inviter, workspace: invite.workspace, email: invite.email_hint })}</p>
            </div>
          )}
          {!invite && inviteErr && (
            <div className="login-invite is-warn" role="alert">
              <Icon name="alert" size={20} />
              <p>{t('login.inviteError', { error: inviteErr })}</p>
            </div>
          )}
          {!invite && !inviteErr && <p>{t('login.default')}</p>}
          <Button href={`/api/auth/google/login${next}`} block className="login-google">
            <span className="g-badge"><GoogleG /></span>
            {t('login.google')}
          </Button>
        </section>
      </div>
    </div>
  )
}