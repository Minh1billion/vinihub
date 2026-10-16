import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useApp } from '@/app/providers/AppContext.jsx'
import { useDialog } from '@/app/providers/DialogContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'
import Icon from '@/shared/ui/Icon.jsx'
import Modal from '@/shared/ui/Modal.jsx'
import { intlLocale } from '@/shared/i18n/index.js'

const day = (iso) => new Date(iso).toLocaleDateString(intlLocale())

function Avatar({ m }) {
  return m.avatar_url
    ? <img className="sh-avatar" src={m.avatar_url} alt="" referrerPolicy="no-referrer" />
    : <span className="sh-avatar">{(m.name || m.email)[0].toUpperCase()}</span>
}

export default function ShareModal({ onClose }) {
  const { t } = useTranslation()
  const { wid, workspaces, user, reload } = useApp()
  const dialog = useDialog()
  const ws = workspaces.find((w) => w.id === wid)
  const isOwner = ws?.role === 'owner'
  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [notice, setNotice] = useState(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([
        api.get(`/workspaces/${wid}/members`),
        isOwner ? api.get(`/workspaces/${wid}/invites`) : [],
      ])
      setMembers(m); setInvites(i)
    } catch (x) { setErr(x.message) }
  }, [wid, isOwner])

  useEffect(() => { load() }, [load])

  const send = async (target) => {
    setBusy(true); setErr(''); setNotice(null); setCopied(false)
    try {
      const r = await api.post(`/workspaces/${wid}/invites`, { email: target })
      setNotice({ ok: r.emailed, email: r.email, error: r.error, link: r.link })
      setEmail('')
      await load()
    } catch (x) { setErr(x.message) } finally { setBusy(false) }
  }

  const submit = (e) => { e.preventDefault(); if (email.trim()) send(email) }

  const revoke = async (i) => {
    try { await api.del(`/workspaces/${wid}/invites/${i.id}`); await load() } catch (x) { dialog.error(x.message) }
  }

  const remove = async (m) => {
    const self = m.id === user.id
    const q = self ? t('share.confirmLeave', { name: ws.name }) : t('share.confirmRemove', { name: m.name || m.email })
    const ok = await dialog.confirm({ tone: 'warning', message: q, confirmLabel: self ? t('share.leave') : t('common.delete'), danger: true })
    if (!ok) return
    try {
      await api.del(`/workspaces/${wid}/members/${m.id}`)
      if (self) { await reload(); onClose() } else await load()
    } catch (x) { dialog.error(x.message) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(notice.link); setCopied(true) } catch { setCopied(false) }
  }

  return (
    <Modal title={t('workspace.membersMenu')} onClose={onClose} className="share-modal">
      {isOwner ? (
        <form className="sh-invite" onSubmit={submit}>
          <label htmlFor="sh-email">{t('share.inviteByEmail')}</label>
          <div className="sh-row">
            <input id="sh-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder={t('share.emailPlaceholder')} autoComplete="off" maxLength={255} />
            <Button type="submit" loading={busy} disabled={!email.trim()} icon="mail">{t('share.send')}</Button>
          </div>
          <small>{t('share.emailHint')}</small>
        </form>
      ) : (
        <p className="sh-note">{t('share.ownerOnly')}</p>
      )}

      <FieldError>{err}</FieldError>

      {notice && (
        <div className={'sh-notice ' + (notice.ok ? 'ok' : 'warn')} role="status">
          <Icon name={notice.ok ? 'check' : 'alert'} size={20} />
          <div>
            <b>{notice.ok ? t('share.sent', { email: notice.email }) : t('share.notSent', { email: notice.email })}</b>
            {!notice.ok && (
              <>
                {notice.error && <p>{notice.error}.</p>}
                <p>{t('share.manualLink')}</p>
                <div className="sh-row">
                  <input readOnly value={notice.link} onFocus={(e) => e.target.select()} aria-label={t('share.linkLabel')} />
                  <Button variant="ghost" icon={copied ? 'check' : 'copy'} onClick={copy}>{copied ? t('share.copied') : t('share.copy')}</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <section>
        <h3 className="sh-h">{t('share.members')} <span>{members.length}</span></h3>
        <ul className="sh-list">
          {members.map((m) => (
            <li key={m.id}>
              <Avatar m={m} />
              <div className="sh-who">
                <div className="sh-name">
                  <b>{m.name || m.email}</b>
                  {m.id === user.id && <span className="sh-tag me">{t('share.you')}</span>}
                  <span className={'sh-tag' + (m.role === 'owner' ? ' owner' : '')}>
                    {m.role === 'owner' ? t('share.owner') : t('share.member')}
                  </span>
                </div>
                {m.name && <small>{m.email}</small>}
              </div>
              {m.role !== 'owner' && (m.id === user.id || isOwner) && (
                <Button variant="danger" size="sm" onClick={() => remove(m)}>{m.id === user.id ? t('share.leave') : t('share.remove')}</Button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && invites.length > 0 && (
        <section>
          <h3 className="sh-h">{t('share.pending')} <span>{invites.length}</span></h3>
          <ul className="sh-list">
            {invites.map((i) => (
              <li key={i.id}>
                <span className="sh-avatar invited"><Icon name="mail" size={16} /></span>
                <div className="sh-who">
                  <b className="sh-email">{i.email}</b>
                  <small>{t('share.expires', { date: day(i.expires_at) })}</small>
                </div>
                <div className="sh-actions">
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => send(i.email)}>{t('share.resend')}</Button>
                  <button className="icon-btn danger" onClick={() => revoke(i)} aria-label={t('share.revokeAria', { email: i.email })} title={t('share.revoke')}>
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Modal>
  )
}
