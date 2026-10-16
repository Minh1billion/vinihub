import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { api } from '@/shared/api/client.js'
import { useDialog } from '@/app/providers/DialogContext.jsx'
import Button from '@/shared/ui/Button.jsx'
import EmptyState from '@/shared/ui/EmptyState.jsx'
import { FieldError } from '@/shared/ui/Field.jsx'
import PageFrame from '@/layout/components/PageFrame.jsx'
import AddKeyModal from '../components/AddKeyModal.jsx'
import ProviderCard from '../components/ProviderCard.jsx'

const TABS = [[{ to: '/providers', labelKey: 'nav.providers', icon: 'key' }]]

export default function ProvidersPage() {
  const { t } = useTranslation()
  const dialog = useDialog()
  const [providers, setProviders] = useState(null)
  const [adding, setAdding] = useState(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => { api.get('/providers').then(setProviders).catch((e) => setErr(e.message)) }, [])

  const replace = useCallback((p) => setProviders((list) => list.map((x) => (x.slug === p.slug ? p : x))), [])

  const run = async (id, job) => {
    setBusy(id); setErr('')
    try { await job() } catch (e) { setErr(e.message) }
    setBusy('')
  }

  const activate = (p, k) => run(`${k.id}:activate`, async () => replace(await api.post(`/providers/${p.slug}/keys/${k.id}/activate`)))
  const check = (p, k) => run(`${k.id}:check`, async () => replace(await api.post(`/providers/${p.slug}/keys/${k.id}/check`)))
  const checkAll = () => run('all', async () => setProviders(await api.post('/providers/check')))
  const remove = async (p, k) => {
    const message = k.active ? t('providers.confirmDeleteActive', { label: k.label }) : t('providers.confirmDelete', { label: k.label })
    if (!(await dialog.confirm({ tone: 'warning', message, confirmLabel: t('common.delete'), danger: true }))) return
    run(`${k.id}:delete`, async () => {
      await api.del(`/providers/${p.slug}/keys/${k.id}`)
      replace({ ...p, keys: p.keys.filter((x) => x.id !== k.id), state: k.active ? 'no_key' : p.state })
    })
  }

  return (
    <PageFrame title={t('providers.title')} ariaLabel={t('providers.title')} tabs={TABS}>
      <section className="page-main">
        <div className="prov-bar">
          <p>{t('providers.intro')}</p>
          <Button variant="ghost" icon="refresh" loading={busy === 'all'} disabled={!providers?.length} onClick={checkAll}>{t('providers.checkAll')}</Button>
        </div>
        <FieldError>{err}</FieldError>
        <div className="prov-list scroll">
          {providers?.length === 0 && <EmptyState title={t('providers.emptyTitle')} text={t('providers.emptyText')} />}
          {providers?.map((p) => (
            <ProviderCard key={p.slug} provider={p} busy={busy} onAdd={setAdding} onActivate={activate} onCheck={check} onDelete={remove} />
          ))}
        </div>
        {adding && <AddKeyModal provider={adding} onSaved={replace} onClose={() => setAdding(null)} />}
      </section>
    </PageFrame>
  )
}
